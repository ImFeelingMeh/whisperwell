import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import MoodCheckin from '@/components/MoodCheckin';
import DropWhisper from '@/components/DropWhisper';
import RespondToWhispers from '@/components/RespondToWhispers';
import VoicesFromWell from '@/components/VoicesFromWell';
import ModerationQueueCard from '@/components/ModerationQueueCard';
import { useWhispers } from '@/hooks/useWhispers';
import { useToast } from '@/hooks/use-toast';

type View = 'home' | 'drop' | 'respond';

const AppPage = () => {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>('home');
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

  const askReportReason = () => {
    const value = window.prompt('Report reason: harassment, hateful content, harmful advice, or spam', 'harassment');
    const normalized = (value || '').trim().toLowerCase();
    const valid = ['harassment', 'hateful content', 'harmful advice', 'spam'];

    if (!valid.includes(normalized)) {
      return null;
    }

    return normalized;
  };

  const handleReportQuestion = async (questionId: string, presetReason?: string) => {
    const reason = presetReason || askReportReason();
    if (!reason) return;

    const { error } = await reportQuestion(questionId, reason);
    if (!error) {
      toast({ title: 'Reported', description: 'Thanks for helping keep WhisperWell safe.' });
      await refreshAll();
    }
  };

  const handleReportAnswer = async (answerId: string, presetReason?: string) => {
    const reason = presetReason || askReportReason();
    if (!reason) return;

    const { error } = await reportAnswer(answerId, reason);
    if (!error) {
      toast({ title: 'Reported', description: 'Thanks for helping keep WhisperWell safe.' });
      await refreshAll();
    }
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
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <h1 className="text-lg font-display font-bold text-primary">
              WhisperWell
            </h1>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign out
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {view === 'home' && (
          <div className="space-y-5 animate-fade-in-up">
            <MoodCheckin userId={user.id} />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView('drop')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-2 rounded-full bg-primary/20 group-hover:bg-primary/30 transition-colors" />
                <div className="text-center">
                  <p className="font-display font-semibold text-sm text-foreground">Drop a whisper</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {responsesRemaining === 0
                      ? 'Your whisper is ready to enter the well'
                      : `${responsesRemaining} more response${responsesRemaining === 1 ? '' : 's'} needed first`}
                  </p>
                </div>
              </button>

              <button
                onClick={() => setView('respond')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-accent/30 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-2 rounded-full bg-accent/25 group-hover:bg-accent/35 transition-colors" />
                <div className="text-center">
                  <p className="font-display font-semibold text-sm text-foreground">Respond to whispers</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Help someone feel less alone</p>
                </div>
              </button>
            </div>

            <VoicesFromWell
              whispers={feed.slice(0, 8)}
              onRespond={() => setView('respond')}
              onReport={(questionId) => handleReportQuestion(questionId)}
            />

            <ModerationQueueCard items={moderationQueue} />

            {/* Gentle message */}
            <div className="text-center py-6">
              <div className="well-visual mb-4 animate-float mx-auto" style={{ width: 100, height: 100 }}>
                <div className="well-opening" style={{ opacity: 0.3 }} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Throw a whisper into the well and hear kind voices echo back.
              </p>
            </div>

            {!loading && responsesDone >= 3 && (
              <div className="rounded-xl border bg-primary/5 px-4 py-3 text-sm text-primary text-center">
                You helped three voices today. Your whisper can now enter the well.
              </div>
            )}
          </div>
        )}

        {view === 'drop' && (
          <DropWhisper
            userId={user.id}
            onBack={() => setView('home')}
            responsesRemaining={responsesRemaining}
            onWhisperSubmitted={refreshAll}
            onReactToAnswer={handleReactToAnswer}
            onReportAnswer={handleReportAnswer}
          />
        )}

        {view === 'respond' && (
          <RespondToWhispers
            userId={user.id}
            onBack={() => setView('home')}
            responsesDone={responsesDone}
            responsesRemaining={responsesRemaining}
            onAnswerSubmitted={refreshAll}
            onReportQuestion={handleReportQuestion}
          />
        )}
      </main>
    </div>
  );
};

export default AppPage;
