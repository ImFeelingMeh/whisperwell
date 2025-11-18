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
      <Card className="border-2 shadow-2xl bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm overflow-hidden relative animate-fade-in-up">
        {/* Gentle bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15">
          <div className="bubble" style={{ left: '25%', width: '8px', height: '8px', animationDelay: '1s', animationDuration: '6s' }} />
          <div className="bubble" style={{ left: '70%', width: '10px', height: '10px', animationDelay: '3s', animationDuration: '5s' }} />
        </div>

        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-display bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
            All quiet
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-center py-12">
            <div className="well-visual mb-8 animate-float">
              <div className="well-opening opacity-50" />
            </div>
            <p className="text-muted-foreground leading-relaxed text-lg">
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
    <Card className="border-2 shadow-2xl bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm overflow-hidden relative animate-fade-in-up hover:shadow-well/10 transition-shadow duration-500">
      {/* Floating bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <div className="bubble" style={{ left: '10%', width: '10px', height: '10px', animationDelay: '0s', animationDuration: '4.5s' }} />
        <div className="bubble" style={{ left: '50%', width: '12px', height: '12px', animationDelay: '2s', animationDuration: '5s' }} />
        <div className="bubble" style={{ left: '85%', width: '8px', height: '8px', animationDelay: '1s', animationDuration: '4s' }} />
      </div>

      <CardHeader className="relative z-10">
        <CardTitle className="text-2xl font-display bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
          Someone asks
        </CardTitle>
        <CardDescription className="text-lg italic pt-4 text-foreground/90 border-l-4 border-well/40 pl-4 my-4 hover:border-well/60 transition-colors duration-300">
          "{claimedQuestion.question_text}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 relative z-10">
        <Textarea
          placeholder="Your whisper..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={150}
          rows={3}
          className="resize-none text-base border-well/20 focus:border-well/50 focus:ring-2 focus:ring-well/20 transition-all duration-300"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">
            {answerText.length}/150
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="min-w-[140px] bg-gradient-to-r from-well to-well-light hover:from-well/90 hover:to-well-light/90 shadow-lg shadow-well/30 hover:shadow-well/40 transition-all duration-300 hover:scale-105 font-display"
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
