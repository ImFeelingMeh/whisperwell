import { useState } from 'react';
import { useAnswer } from '@/hooks/useAnswer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AnswerTabProps {
  userId: string;
}

const AnswerTab = ({ userId }: AnswerTabProps) => {
  const { claimedQuestion, loading, submitAnswer } = useAnswer(userId);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!answerText.trim()) return;

    setSubmitting(true);
    const { error } = await submitAnswer(answerText);
    
    if (!error) {
      setAnswerText('');
    }
    
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No question available
  if (!claimedQuestion) {
    return (
      <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">All quiet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="well-visual mb-8">
              <div className="well-opening opacity-50" />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              All quiet — come back later, <br />
              your whisper will be needed.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Question available to answer
  return (
    <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50">
      <CardHeader>
        <CardTitle className="text-xl">Someone asks</CardTitle>
        <CardDescription className="text-lg italic pt-4 text-foreground/80">
          "{claimedQuestion.question_text}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Your whisper..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={150}
          rows={3}
          className="resize-none text-base"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {answerText.length}/150
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="min-w-[120px]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Whisper'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnswerTab;
