import { useState } from 'react';
import { useQuestion } from '@/hooks/useQuestion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AskTabProps {
  userId: string;
}

const AskTab = ({ userId }: AskTabProps) => {
  const { myQuestion, answers, loading, askQuestion } = useQuestion(userId);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropping, setDropping] = useState(false);

  const handleAsk = async () => {
    if (!questionText.trim()) return;

    setDropping(true);
    
    // Wait for drop animation
    setTimeout(async () => {
      setSubmitting(true);
      const { error } = await askQuestion(questionText);
      
      if (!error) {
        setQuestionText('');
      }
      
      setSubmitting(false);
      setDropping(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // User has an active or completed question
  if (myQuestion) {
    if (myQuestion.status === 'complete' && answers.length === 3) {
      return (
        <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-xl">Your question returned</CardTitle>
            <CardDescription className="text-base italic text-muted-foreground">"{myQuestion.text}"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {answers.map((answer) => (
                <div
                  key={answer.answer_order}
                  className="answer-line p-5 bg-gradient-to-br from-secondary/40 to-secondary/20 rounded-xl border-2 border-well/20 shadow-sm"
                >
                  <p className="text-foreground leading-relaxed">{answer.answer_text}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center pt-4">
              Three voices answered. You may ask again.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Ask Another Question
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Question is still waiting for answers
    return (
      <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50">
        <CardHeader>
          <CardTitle className="text-xl">In the Well</CardTitle>
          <CardDescription className="text-base italic text-muted-foreground">"{myQuestion.text}"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="well-visual mb-8">
              <div className="well-opening">
                <div className="waiting-ripple" />
                <div className="waiting-ripple" />
                <div className="waiting-ripple" />
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Your question's in the Well. <br />
              When three voices answer, we'll bring it back.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No active question - allow user to ask
  return (
    <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50">
      <CardHeader>
        <CardTitle className="text-xl">Drop a question in the Well</CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Ask one short question. Keep it brief — the Well loves whispers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="well-visual">
          <div className="well-opening" />
        </div>
        
        <div className="space-y-4 relative">
          {dropping && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="question-drop bg-well/20 rounded-lg p-4 border border-well/40">
                <p className="text-sm text-foreground">{questionText}</p>
              </div>
            </div>
          )}
          
          <Textarea
            placeholder="What's on your mind?"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            maxLength={200}
            rows={3}
            className="resize-none text-base"
            disabled={dropping || submitting}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {questionText.length}/200
            </span>
            <Button
              onClick={handleAsk}
              disabled={!questionText.trim() || submitting || dropping}
              className="min-w-[140px]"
            >
              {dropping || submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {dropping ? 'Dropping...' : 'Sending...'}
                </>
              ) : (
                'Drop in the Well'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AskTab;
