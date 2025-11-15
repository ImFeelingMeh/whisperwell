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
      <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
        {/* Gentle bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
          <div className="bubble" style={{ left: '25%', width: '8px', height: '8px', animationDelay: '1s', animationDuration: '6s' }} />
          <div className="bubble" style={{ left: '70%', width: '10px', height: '10px', animationDelay: '3s', animationDuration: '5s' }} />
        </div>

        <CardHeader className="relative z-10">
          <CardTitle className="text-xl bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
            All quiet
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
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
    <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Floating bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="bubble" style={{ left: '10%', width: '10px', height: '10px', animationDelay: '0s', animationDuration: '4.5s' }} />
        <div className="bubble" style={{ left: '50%', width: '12px', height: '12px', animationDelay: '2s', animationDuration: '5s' }} />
        <div className="bubble" style={{ left: '85%', width: '8px', height: '8px', animationDelay: '1s', animationDuration: '4s' }} />
      </div>

      <CardHeader className="relative z-10">
        <CardTitle className="text-xl bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
          Someone asks
        </CardTitle>
        <CardDescription className="text-lg italic pt-4 text-foreground/80 border-l-4 border-well/30 pl-4 my-4">
          "{claimedQuestion.question_text}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <Textarea
          placeholder="Your whisper..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={150}
          rows={3}
          className="resize-none text-base border-well/20 focus:border-well/40 transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {answerText.length}/150
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="min-w-[120px] bg-gradient-to-r from-well to-well-light hover:from-well/90 hover:to-well-light/90 shadow-lg shadow-well/20"
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
