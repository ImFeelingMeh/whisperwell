import { useState } from 'react';
import { useAnswer } from '@/hooks/useAnswer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, EMOTIONS, RESPONSE_PROMPTS } from '@/lib/constants';
import { Loader2, ArrowLeft, Lightbulb } from 'lucide-react';

interface RespondToWhispersProps {
  userId: string;
  onBack: () => void;
}

const RespondToWhispers = ({ userId, onBack }: RespondToWhispersProps) => {
  const { claimedQuestion, loading, submitAnswer } = useAnswer(userId);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activePrompt, setActivePrompt] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    const { error } = await submitAnswer(answerText);
    if (!error) {
      setAnswerText('');
      setActivePrompt(null);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!claimedQuestion) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Card className="border shadow-lg">
          <CardContent className="py-16 text-center">
            <div className="well-visual mb-6 animate-float mx-auto" style={{ width: 120, height: 120 }}>
              <div className="well-opening" style={{ opacity: 0.4 }} />
            </div>
            <p className="text-lg font-display text-muted-foreground mb-1">All quiet right now</p>
            <p className="text-sm text-muted-foreground">Come back later — your kindness will be needed.</p>
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card className="border shadow-lg">
        <CardHeader>
          <CardTitle className="text-base font-display text-muted-foreground">
            Someone dropped this into the well
          </CardTitle>
          <div className="pt-2">
            <blockquote className="text-lg text-foreground border-l-4 border-primary/30 pl-4 italic leading-relaxed">
              "{claimedQuestion.question_text}"
            </blockquote>
          </div>
          <div className="flex gap-2 flex-wrap pt-2">
            {emotionData && (
              <span className="emotion-tag bg-lavender/20 text-accent-foreground">
                {emotionData.emoji} {emotionData.label}
              </span>
            )}
            {categoryData && (
              <span className="emotion-tag bg-primary/10 text-primary">
                {categoryData.emoji} {categoryData.label}
              </span>
            )}
          </div>
          {ventModeText && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 mt-2">
              💡 {ventModeText}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Response prompts */}
          <div>
            <p className="text-xs font-display font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Response prompts (optional)
            </p>
            <div className="flex flex-col gap-1.5">
              {RESPONSE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setActivePrompt(activePrompt === i ? null : i)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
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

          {/* Tips */}
          <div className="bg-sage-light/30 dark:bg-sage/10 rounded-xl px-4 py-3">
            <p className="text-xs font-display font-semibold text-sage-dark dark:text-sage mb-1">Tips for responding</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              <li>• Share something that helped you</li>
              <li>• Offer encouragement</li>
              <li>• Let them know they're not alone</li>
              <li>• Be kind and thoughtful</li>
            </ul>
          </div>

          <div>
            <Textarea
              placeholder="What would you say?"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              maxLength={250}
              rows={3}
              className="resize-none text-base"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{answerText.length}/250</p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="w-full font-display text-base h-11"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            ) : (
              'Send your response'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RespondToWhispers;
