import { useState } from 'react';
import { useQuestion } from '@/hooks/useQuestion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, EMOTIONS, VENT_MODES } from '@/lib/constants';
import { Loader2, ArrowLeft } from 'lucide-react';

interface DropWhisperProps {
  userId: string;
  onBack: () => void;
}

const DropWhisper = ({ userId, onBack }: DropWhisperProps) => {
  const { myQuestion, answers, loading, askQuestion } = useQuestion(userId);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [emotion, setEmotion] = useState('');
  const [ventMode, setVentMode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setDropping(true);

    setTimeout(async () => {
      setSubmitting(true);
      const { error } = await askQuestion(text, category || undefined, emotion || undefined, ventMode || undefined);
      if (!error) {
        setText('');
        setCategory('');
        setEmotion('');
        setVentMode('');
      }
      setSubmitting(false);
      setDropping(false);
    }, 1200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  // Show completed answers
  if (myQuestion?.status === 'complete' && answers.length === 3 && showCompleted) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Card className="border shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-display text-primary">
              Three voices answered your whisper
            </CardTitle>
            <CardDescription className="italic">"{myQuestion.text}"</CardDescription>
            <div className="flex gap-2 flex-wrap pt-1">
              {myQuestion.emotion && (
                <span className="emotion-tag bg-lavender/20 text-accent-foreground">
                  {EMOTIONS.find(e => e.value === myQuestion.emotion)?.emoji} {myQuestion.emotion}
                </span>
              )}
              {myQuestion.category && (
                <span className="emotion-tag bg-primary/10 text-primary">
                  {CATEGORIES.find(c => c.value === myQuestion.category)?.emoji} {CATEGORIES.find(c => c.value === myQuestion.category)?.label}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer, index) => (
              <div
                key={answer.answer_order}
                className="answer-line p-4 bg-muted/50 rounded-xl border"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <p className="text-foreground leading-relaxed text-sm">{answer.answer_text}</p>
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
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
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
                Waiting for three kind voices to respond…
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Card className="border shadow-lg overflow-hidden relative">
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
          <CardDescription>
            Drop your whisper into the well. It will be answered with care.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Textarea
              placeholder="Write your whisper here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting || dropping}
              rows={4}
              maxLength={300}
              className="resize-none text-base"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{text.length}/300</p>
          </div>

          {/* Category */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">Category (optional)</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                  className={`category-chip ${category === cat.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'}`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">How are you feeling? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((em) => (
                <button
                  key={em.value}
                  onClick={() => setEmotion(emotion === em.value ? '' : em.value)}
                  className={`category-chip ${emotion === em.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-accent/30'}`}
                >
                  {em.emoji} {em.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vent mode */}
          <div>
            <p className="text-sm font-display font-semibold text-muted-foreground mb-2">What kind of response do you want? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {VENT_MODES.map((vm) => (
                <button
                  key={vm.value}
                  onClick={() => setVentMode(ventMode === vm.value ? '' : vm.value)}
                  className={`category-chip ${ventMode === vm.value ? 'selected' : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'}`}
                >
                  {vm.emoji} {vm.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting || dropping}
            className="w-full font-display text-base h-11"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
            ) : dropping ? (
              'Dropping into the well…'
            ) : (
              'Drop your whisper'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Before your whisper enters the well, help three others first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DropWhisper;
