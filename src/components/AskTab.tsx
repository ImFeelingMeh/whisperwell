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
    
    // Wait for drop animation with splash
    setTimeout(async () => {
      setSubmitting(true);
      const { error } = await askQuestion(questionText);
      
      if (!error) {
        setQuestionText('');
      }
      
      setSubmitting(false);
      setDropping(false);
    }, 1400);
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
        <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
              Your question returned
            </CardTitle>
            <CardDescription className="text-base italic text-muted-foreground">"{myQuestion.text}"</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {answers.map((answer) => (
                <div
                  key={answer.answer_order}
                  className="answer-line p-5 bg-gradient-to-br from-well/10 to-water-surface/10 rounded-xl border-2 border-well/30 shadow-md hover:shadow-lg hover:border-well/50 transition-all duration-300"
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
              className="w-full bg-gradient-to-r from-well to-well-light hover:from-well/90 hover:to-well-light/90 shadow-lg shadow-well/20"
            >
              Ask Another Question
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Question is still waiting for answers
    return (
      <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
        {/* Floating bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="bubble" style={{ left: '20%', width: '10px', height: '10px', animationDelay: '0.5s', animationDuration: '5s' }} />
          <div className="bubble" style={{ left: '60%', width: '14px', height: '14px', animationDelay: '2s', animationDuration: '4s' }} />
          <div className="bubble" style={{ left: '80%', width: '8px', height: '8px', animationDelay: '3.5s', animationDuration: '5.5s' }} />
        </div>

        <CardHeader className="relative z-10">
          <CardTitle className="text-xl bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
            In the Well
          </CardTitle>
          <CardDescription className="text-base italic text-muted-foreground">"{myQuestion.text}"</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
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
    <Card className="border-2 shadow-lg bg-gradient-to-b from-card to-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Floating bubbles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="bubble" style={{ left: '15%', width: '12px', height: '12px', animationDelay: '0s', animationDuration: '4s' }} />
        <div className="bubble" style={{ left: '45%', width: '8px', height: '8px', animationDelay: '1.5s', animationDuration: '5s' }} />
        <div className="bubble" style={{ left: '75%', width: '10px', height: '10px', animationDelay: '3s', animationDuration: '4.5s' }} />
        <div className="bubble" style={{ left: '85%', width: '6px', height: '6px', animationDelay: '2s', animationDuration: '3.5s' }} />
      </div>

      <CardHeader className="relative z-10">
        <CardTitle className="text-xl bg-gradient-to-r from-well to-well-light bg-clip-text text-transparent">
          Drop a question in the Well
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Ask anything that weighs on you. <br />
          Three strangers will answer, kind and true.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        <div className="relative">
          <div className="well-visual mb-8">
            <div className="well-opening" />
            {dropping && (
              <>
                <div className="water-splash rounded-full border-[3px]" style={{ animationDelay: '0.6s' }} />
                <div className="water-splash rounded-full border-[2px]" style={{ animationDelay: '0.7s' }} />
              </>
            )}
          </div>
          
          {dropping && (
            <div
              className="question-drop absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-br from-well/30 to-well-light/20 px-6 py-3 rounded-full border-2 border-water-surface/50 shadow-xl backdrop-blur-md"
              style={{ zIndex: 10 }}
            >
              <p className="text-sm text-well-deep dark:text-water-surface font-medium max-w-[200px] truncate">
                {questionText}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            disabled={submitting || dropping}
            rows={4}
            maxLength={500}
            className="resize-none text-base border-well/20 focus:border-well/40 transition-colors"
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {questionText.length}/500
            </span>
            <Button
              onClick={handleAsk}
              disabled={!questionText.trim() || submitting || dropping}
              className="min-w-[160px] ripple-container bg-gradient-to-r from-well to-well-light hover:from-well/90 hover:to-well-light/90 shadow-lg shadow-well/20 transition-all duration-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Waiting...
                </>
              ) : dropping ? (
                'Dropping...'
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
