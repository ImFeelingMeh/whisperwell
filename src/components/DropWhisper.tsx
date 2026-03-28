import { useState } from 'react';
import { useQuestion } from '@/hooks/useQuestion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, EMOTIONS, REACTION_TYPES, VENT_MODES } from '@/lib/constants';
import { hasCrisisSignal, isBlockedForSafety } from '@/lib/safety';
import { useToast } from '@/hooks/use-toast';

interface DropWhisperProps {
  userId: string;
  onBack: () => void;
  responsesRemaining: number;
  onWhisperSubmitted: () => Promise<void>;
  onReactToAnswer: (answerId: string, reactionType: string) => Promise<void>;
  onReportAnswer: (answerId: string, reason: string) => Promise<void>;
}

const DropWhisper = ({
  userId,
  onBack,
  responsesRemaining,
  onWhisperSubmitted,
  onReactToAnswer,
  onReportAnswer,
}: DropWhisperProps) => {
  const { myQuestion, answers, loading, askQuestion } = useQuestion(userId);
  const [text, setText] = useState('');
  const [category, setCategory] = useState(''); // Category (required)
  const [emotion, setEmotion] = useState(''); // Emotion (required)
  const [ventMode, setVentMode] = useState(''); // Intent (required)
  const [submitting, setSubmitting] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!text.trim() || !category || !emotion || !ventMode) {
      toast({
        title: 'Almost there',
        description: 'Please add a category, emotion, and intent before sending into the well.',
      });
      return;
    }

    if (responsesRemaining > 0) {
      toast({
        title: 'Cooldown active',
        description: `Answer ${responsesRemaining} more whisper${responsesRemaining === 1 ? '' : 's'} before your next drop.`,
      });
      return;
    }

    if (isBlockedForSafety(text)) {
      toast({
        title: 'Whisper blocked for safety',
        description: 'Please rewrite with kind, non-harmful language.',
        variant: 'destructive',
      });
      return;
    }

    setDropping(true);

    setTimeout(async () => {
      setSubmitting(true);
      const { error } = await askQuestion(text, category || undefined, emotion || undefined, ventMode || undefined);
      if (!error) {
        setText('');
        setCategory('');
        setEmotion('');
        setVentMode('');
        await onWhisperSubmitted();
      }
      setSubmitting(false);
      setDropping(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Show completed answers
  if (myQuestion?.status === 'complete' && answers.length > 0 && showCompleted) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </button>
        <Card className="panel-surface">
          <CardHeader>
            <CardTitle className="text-xl font-display text-primary">
              3 people took time to respond to you.
            </CardTitle>
            <CardDescription className="italic">"{myQuestion.text}"</CardDescription>
            <div className="flex gap-2 flex-wrap pt-1">
              {myQuestion.emotion && (
                <span className="emotion-tag bg-lavender/20 text-accent-foreground">
                  {EMOTIONS.find(e => e.value === myQuestion.emotion)?.label}
                </span>
              )}
              {myQuestion.category && (
                <span className="emotion-tag bg-primary/10 text-primary">
                  {CATEGORIES.find(c => c.value === myQuestion.category)?.label}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer, index) => (
              <div
                key={answer.answer_id}
                className="answer-line p-4 bg-muted/50 rounded-xl border"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <p className="text-foreground leading-relaxed text-sm">{answer.answer_text}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {REACTION_TYPES.map((reaction) => (
                      <button
                        key={reaction.value}
                        onClick={() => onReactToAnswer(answer.answer_id, reaction.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border ${
                          answer.my_reaction === reaction.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {reaction.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onReportAnswer(answer.answer_id, 'harmful advice')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Report
                  </button>
                </div>
              </div>
            ))}
            <Button
              onClick={() => setShowCompleted(false)}
              className="w-full mt-4 font-display"
            >
              Drop another whisper
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active question waiting for answers
  if (myQuestion && myQuestion.status !== 'complete') {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </button>
        <Card className="border shadow-lg overflow-hidden relative">
          <CardHeader>
            <CardTitle className="text-xl font-display text-primary">Your whisper is in the well</CardTitle>
            <CardDescription className="italic">"{myQuestion.text}"</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="well-visual mb-6 animate-float">
                <div className="well-opening">
                  <div className="waiting-ripple" />
                  <div className="waiting-ripple" />
                  <div className="waiting-ripple" />
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Waiting for voices to return with care.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Drop a new whisper form
  return (
    <div className="space-y-4 animate-fade-in-up">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        Back
      </button>

      <Card className="panel-surface overflow-hidden relative">
        {dropping && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <div className="well-visual">
              <div className="well-opening" />
              <div className="water-splash" style={{ animationDelay: '0.5s' }} />
              <div className="water-splash" style={{ animationDelay: '0.7s' }} />
            </div>
          </div>
        )}

        <CardHeader>
          <CardTitle className="text-xl font-display text-primary">
            What's on your mind?
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Write something you might not say out loud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
            {responsesRemaining > 0
              ? `Cooldown: answer ${responsesRemaining} more whisper${responsesRemaining === 1 ? '' : 's'} before your next drop.`
              : 'Before your whisper enters the well, help three others.'}
          </div>

          <div>
            <Textarea
              placeholder="What's on your mind?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting || dropping}
              rows={4}
              maxLength={300}
              className="resize-none text-base rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{text.length}/300</p>
          </div>

          {hasCrisisSignal(text) && (
            <div className="rounded-lg border border-lavender bg-lavender/10 p-3 text-sm text-foreground">
              <p className="mb-1">
                It sounds like you're going through something really difficult. If you need immediate help, here are people who care and can support you.
              </p>
              <a
                href="https://findahelpline.com/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Find local crisis support
              </a>
            </div>
          )}

          {/* Category */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">Category (required)</p>
            <div className="flex flex-wrap gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className={`category-chip ${category === cat.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">Emotion (required)</p>
            <div className="flex flex-wrap gap-2.5">
              {EMOTIONS.map((em) => (
                <button
                  key={em.value}
                  onClick={() => setEmotion(emotion === em.value ? '' : em.value)}
                  className={`category-chip ${emotion === em.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-accent/30'}`}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vent mode */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">Intent (required)</p>
            <div className="flex flex-wrap gap-2.5">
              {VENT_MODES.map((vm) => (
                <button
                  key={vm.value}
                  onClick={() => setVentMode(ventMode === vm.value ? '' : vm.value)}
                  className={`category-chip ${ventMode === vm.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'}`}
                >
                  {vm.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || !category || !emotion || !ventMode || submitting || dropping || responsesRemaining > 0}
            className="w-full font-display text-base h-11 rounded-xl"
          >
            {submitting ? (
              'Sending…'
            ) : dropping ? (
              'Dropping into the well…'
            ) : (
              'Send into the well'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Reciprocity applies after each drop to keep the well supportive and thoughtful.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DropWhisper;
