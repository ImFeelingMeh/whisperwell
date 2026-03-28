import { useEffect, useState } from 'react';
import { useAnswer } from '@/hooks/useAnswer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, EMOTIONS, RESPONSE_PROMPTS } from '@/lib/constants';
import { isBlockedForSafety } from '@/lib/safety';
import { useToast } from '@/hooks/use-toast';

interface RespondToWhispersProps {
  userId: string;
  onBack: () => void;
  initialWhisper: {
    id: string;
    text: string;
    category: string | null;
    emotion: string | null;
    vent_mode?: string | null;
  } | null;
  responsesDone: number;
  responsesRemaining: number;
  onAnswerSubmitted: () => Promise<void>;
  onReportQuestion: (questionId: string, reason: string) => Promise<void>;
}

const RespondToWhispers = ({
  userId,
  onBack,
  initialWhisper,
  responsesDone,
  responsesRemaining,
  onAnswerSubmitted,
  onReportQuestion,
}: RespondToWhispersProps) => {
  const { claimedQuestion, loading, submitAnswer, setManualQuestion } = useAnswer(userId);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number>(0);
  const { toast } = useToast();

  const sentenceStarters = [
    'When I went through something similar,',
    'You are not alone in feeling this,',
    'One thing that helped me was',
  ] as const;

  const starterText = sentenceStarters[activePrompt];

  const insertStarter = () => {
    if (!answerText.trim()) {
      setAnswerText(`${starterText} `);
      return;
    }

    if (!answerText.startsWith(starterText)) {
      setAnswerText(`${starterText} ${answerText.trim()}`);
    }
  };

  useEffect(() => {
    if (!initialWhisper) return;

    setManualQuestion({
      question_id: initialWhisper.id,
      question_text: initialWhisper.text,
      question_category: initialWhisper.category,
      question_emotion: initialWhisper.emotion,
      question_vent_mode: initialWhisper.vent_mode ?? null,
    });
  }, [initialWhisper, setManualQuestion]);

  const handleSubmit = async () => {
    if (!answerText.trim()) return;

    if (isBlockedForSafety(answerText)) {
      toast({
        title: 'Response blocked for safety',
        description: 'Please keep your response kind and non-harmful.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { error } = await submitAnswer(answerText);
    if (!error) {
      const nextCount = responsesDone + 1;
      setAnswerText('');
      setActivePrompt(0);
      toast({ title: 'Someone out there needed that.' });
      if (nextCount >= 5 && nextCount % 5 === 0) {
        toast({ title: `You\'ve helped ${nextCount} people feel less alone.` });
      }
      await onAnswerSubmitted();
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!claimedQuestion) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </button>
        <Card className="panel-surface">
          <CardContent className="py-16 text-center">
            <div className="well-visual mb-6 animate-float mx-auto" style={{ width: 120, height: 120 }}>
              <div className="well-opening" style={{ opacity: 0.4 }} />
            </div>
            {responsesRemaining === 0 && responsesDone >= 3 ? (
              <>
                <p className="text-lg font-display text-primary mb-1">You\'ve helped 3 of 3 people.</p>
                <p className="text-sm text-muted-foreground">Your whisper can now enter the well.</p>
              </>
            ) : responsesRemaining === 0 ? (
              <>
                <p className="text-lg font-display text-muted-foreground mb-1">No whispers available right now</p>
                <p className="text-sm text-muted-foreground">Check back soon, or drop your own whisper now.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-display text-muted-foreground mb-1">All quiet right now</p>
                <p className="text-sm text-muted-foreground">Come back later — your kindness will be needed.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const emotionData = claimedQuestion.question_emotion
    ? EMOTIONS.find(e => e.value === claimedQuestion.question_emotion)
    : null;
  const categoryData = claimedQuestion.question_category
    ? CATEGORIES.find(c => c.value === claimedQuestion.question_category)
    : null;

  const ventModeText = claimedQuestion.question_vent_mode === 'vent'
    ? 'They just need to vent — listen and validate.'
    : claimedQuestion.question_vent_mode === 'advice'
    ? 'They\'re looking for advice.'
    : claimedQuestion.question_vent_mode === 'encouragement'
    ? 'They need encouragement right now.'
    : null;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        Back
      </button>

      <Card className="panel-surface">
        <CardHeader className="space-y-3">
          <CardDescription className="section-heading">Offer support</CardDescription>
          <CardTitle className="text-base font-display text-muted-foreground leading-relaxed">
            Someone dropped this into the well. What would you say?
          </CardTitle>
          <div className="pt-2">
            <blockquote className="text-lg text-foreground border-l-4 border-primary/30 pl-4 italic leading-relaxed">
              "{claimedQuestion.question_text}"
            </blockquote>
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {emotionData && (
              <span className="emotion-tag bg-lavender/20 text-accent-foreground">
                {emotionData.label}
              </span>
            )}
            {categoryData && (
              <span className="emotion-tag bg-primary/10 text-primary">
                {categoryData.label}
              </span>
            )}
          </div>
          {ventModeText && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 mt-1">
              {ventModeText}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <p className="text-xs font-display font-semibold text-muted-foreground mb-2">
              Choose how you want to respond:
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              {RESPONSE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setActivePrompt(i)}
                  className={`text-left text-xs px-3 py-2 rounded-xl border transition-all ${
                    activePrompt === i
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-transparent bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground/90 mb-1">Sentence starter</p>
            <p className="mb-2">{starterText}</p>
            <button
              type="button"
              onClick={insertStarter}
              className="text-xs rounded-full border px-3 py-1 hover:bg-background"
            >
              Use this starter
            </button>
          </div>

          <div className="quiet-note">
            Keep it kind, specific, and human. One thoughtful sentence helps more than generic advice.
          </div>

          <div>
            <Textarea
              placeholder="What would you say?"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              maxLength={250}
              rows={3}
              className="resize-none text-base rounded-xl"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{answerText.length}/250</p>
          </div>

          <div className="rounded-xl border bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Remember: someone on the other side is having a hard day.
          </div>

          <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Would this feel supportive if you received it?
          </div>

          <div className="rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            You\'ve helped {Math.min(responsesDone, 3)} of 3 people.
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="w-full font-display text-base h-11 rounded-full"
          >
            {submitting ? (
              'Sending…'
            ) : (
              'Send support'
            )}
          </Button>

          <button
            onClick={() => onReportQuestion(claimedQuestion.question_id, 'harassment')}
            className="text-xs text-muted-foreground hover:text-foreground mx-auto block"
          >
            Report this whisper
          </button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RespondToWhispers;
