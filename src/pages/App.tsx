import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import MoodCheckin from '@/components/MoodCheckin';
import DropWhisper from '@/components/DropWhisper';
import RespondToWhispers from '@/components/RespondToWhispers';
import VoicesFromWell from '@/components/VoicesFromWell';
import ModerationQueueCard from '@/components/ModerationQueueCard';
import ReportScreen, { type ReportTarget } from '@/components/ReportScreen';
import MoodBuddyChat from '@/components/MoodBuddyChat';
import { useWhispers } from '@/hooks/useWhispers';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';

type View = 'home' | 'drop' | 'respond' | 'report' | 'mood-chat';

type SelectedWhisper = {
  id: string;
  asker_id?: string;
  text: string;
  category: string | null;
  emotion: string | null;
  vent_mode?: string | null;
};

type MoodRoomState = {
  mood: string | null;
};

const AppPage = () => {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>('home');
  const [selectedWhisper, setSelectedWhisper] = useState<SelectedWhisper | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [moodRoomState, setMoodRoomState] = useState<MoodRoomState>({ mood: null });
  const { toast } = useToast();

  const {
    feed,
    responsesDone,
    responsesRemaining,
    moderationQueue,
    loading,
    refreshAll,
    reportQuestion,
    reportAnswer,
    reactToAnswer,
  } = useWhispers(user?.id);

  if (!user) return null;

  const returnPrompts = [
    'Someone could use your voice today.',
    'Your words helped someone yesterday.',
  ] as const;
  const dayIndex = new Date().getDate() % returnPrompts.length;

  const openQuestionReport = ({ questionId, snippet }: { questionId: string; snippet?: string }) => {
    setReportTarget({
      contentType: 'question',
      contentId: questionId,
      snippet,
    });
    setView('report');
  };

  const openAnswerReport = ({ answerId, snippet }: { answerId: string; snippet?: string }) => {
    setReportTarget({
      contentType: 'answer',
      contentId: answerId,
      snippet,
    });
    setView('report');
  };

  const submitReport = async (reason: string, details?: string) => {
    if (!reportTarget) return;

    const insertPayload: any = {
      reporter_id: user.id,
      reason,
      details: details || null,
      status: 'open',
      question_id: null,
      answer_id: null,
    };

    if (reportTarget.contentType === 'question') {
      insertPayload.question_id = reportTarget.contentId;
    } else {
      insertPayload.answer_id = reportTarget.contentId;
    }

    const directInsert = await (supabase as any)
      .from('reports' as any)
      .insert(insertPayload as any);

    let finalError = directInsert.error;

    if (finalError) {
      const fallback = reportTarget.contentType === 'question'
        ? await reportQuestion(reportTarget.contentId, reason)
        : await reportAnswer(reportTarget.contentId, reason);
      finalError = fallback.error;
    }

    if (finalError) {
      toast({
        title: 'Could not submit report',
        description: 'Please run the latest Supabase migration and try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Report submitted', description: 'Thanks for helping keep WhisperWell safe.' });
    setReportTarget(null);
    setView('home');
    await refreshAll();
  };

  const handleReactToAnswer = async (answerId: string, reactionType: string) => {
    const { error } = await reactToAnswer(answerId, reactionType);
    if (!error) {
      await refreshAll();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="app-shell py-3 flex items-center justify-between gap-3">
          <button onClick={() => setView('home')} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <h1 className="text-lg font-display font-bold text-primary">
              WhisperWell
            </h1>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-full border bg-background/80 p-1">
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  theme === 'light'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                  theme === 'dark'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dark
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`app-shell app-main ${view === 'home' ? '' : 'max-w-3xl'}`}>
        {view === 'home' && (
          <div className="space-y-4 animate-fade-in-up">
            <section className="panel-surface px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="section-heading mb-1">Today</p>
                  <p className="text-sm text-foreground/90">A calm place to share, listen, and support.</p>
                  <p className="text-xs text-muted-foreground mt-2">{returnPrompts[dayIndex]}</p>
                </div>
                <div className="w-full md:w-72 space-y-2">
                  <p className="text-xs text-muted-foreground">You\'ve helped {Math.min(responsesDone, 3)} of 3 people before your next whisper.</p>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${(Math.min(responsesDone, 3) / 3) * 100}%` }} />
                  </div>
                </div>
              </div>
            </section>

            <div className="home-grid">
              <div className="home-main">
                <MoodCheckin
                  userId={user.id}
                  onMoodChange={(mood) => setMoodRoomState({ mood })}
                  onOpenMoodChat={(mood) => {
                    setMoodRoomState({ mood });
                    setView('mood-chat');
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button onClick={() => setView('drop')} className="action-tile group">
                    <div className="action-marker bg-primary/25 group-hover:bg-primary/35" />
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground">Drop a whisper</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {responsesRemaining === 0
                          ? 'Your whisper is ready to enter the well'
                          : `Cooldown: ${responsesRemaining} response${responsesRemaining === 1 ? '' : 's'} left before next drop`}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedWhisper(null);
                      setView('respond');
                    }}
                    className="action-tile group"
                  >
                    <div className="action-marker bg-accent/30 group-hover:bg-accent/40" />
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground">Respond to whispers</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Help someone feel less alone</p>
                    </div>
                  </button>

                  <button onClick={() => setView('mood-chat')} className="action-tile group">
                    <div className="action-marker bg-teal/25 group-hover:bg-teal/35" />
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground">Open today&apos;s mood room</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Talk with people feeling the same way today</p>
                    </div>
                  </button>
                </div>

                {!loading && responsesDone >= 3 && (
                  <div className="rounded-xl border bg-primary/5 px-4 py-3 text-sm text-primary">
                    You helped three people feel less alone. Your whisper is now entering the well.
                  </div>
                )}
              </div>

              <div className="home-side">
                <VoicesFromWell
                  whispers={feed.slice(0, 8)}
                  onRefresh={refreshAll}
                  onRespond={(whisper) => {
                    if (whisper.asker_id === user.id) {
                      toast({
                        title: 'Cannot answer your own whisper',
                        description: 'Choose another whisper from the well.',
                      });
                      return;
                    }
                    setSelectedWhisper(whisper);
                    setView('respond');
                  }}
                  onReport={(target) => openQuestionReport(target)}
                />

                <div className="panel-surface text-center py-6 px-4">
                  <div className="well-visual mb-4 animate-float mx-auto" style={{ width: 100, height: 100 }}>
                    <div className="well-opening" style={{ opacity: 0.3 }} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    Share honestly, then return to support one voice at a time.
                  </p>
                </div>

                <ModerationQueueCard items={moderationQueue} />
              </div>
            </div>
          </div>
        )}

        {view === 'drop' && (
          <DropWhisper
            userId={user.id}
            onBack={() => setView('home')}
            responsesRemaining={responsesRemaining}
            onWhisperSubmitted={refreshAll}
            onReactToAnswer={handleReactToAnswer}
            onReportAnswer={openAnswerReport}
          />
        )}

        {view === 'respond' && (
          <RespondToWhispers
            userId={user.id}
            onBack={() => setView('home')}
            initialWhisper={selectedWhisper}
            responsesDone={responsesDone}
            responsesRemaining={responsesRemaining}
            onAnswerSubmitted={refreshAll}
            onReportQuestion={openQuestionReport}
          />
        )}

        {view === 'report' && (
          <ReportScreen
            target={reportTarget}
            onBack={() => setView('home')}
            onSubmitReport={submitReport}
          />
        )}

        {view === 'mood-chat' && (
          <MoodBuddyChat
            userId={user.id}
            onBack={() => setView('home')}
            initialMood={moodRoomState.mood}
          />
        )}
      </main>
    </div>
  );
};

export default AppPage;
