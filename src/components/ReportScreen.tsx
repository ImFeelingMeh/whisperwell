import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export type ReportTarget = {
  contentType: 'question' | 'answer';
  contentId: string;
  snippet?: string;
};

interface ReportScreenProps {
  target: ReportTarget | null;
  onBack: () => void;
  onSubmitReport: (reason: string, details?: string) => Promise<void>;
}

const REASONS = [
  'harassment',
  'hateful content',
  'harmful advice',
  'spam',
  'self-harm risk',
  'other',
] as const;

const ReportScreen = ({ target, onBack, onSubmitReport }: ReportScreenProps) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const helperText = useMemo(() => {
    if (!target) return 'Choose a reason and submit.';
    return target.contentType === 'question'
      ? 'You are reporting a whisper from the well.'
      : 'You are reporting a response shown in your chain.';
  }, [target]);

  const handleSubmit = async () => {
    if (!selectedReason.trim()) return;

    setSubmitting(true);
    await onSubmitReport(selectedReason, details.trim() || undefined);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        Back
      </button>

      <Card className="panel-surface">
        <CardHeader>
          <CardTitle className="text-xl font-display text-primary">Report content</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {helperText}
          </CardDescription>
          {target?.snippet && (
            <blockquote className="mt-1 rounded-xl border bg-muted/30 px-3 py-2 text-sm text-foreground/90 italic">
              "{target.snippet}"
            </blockquote>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-display text-muted-foreground mb-2">Reason</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`text-left rounded-xl border px-3 py-2 text-sm transition-colors ${
                    selectedReason === reason
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-background hover:bg-muted/25 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-display text-muted-foreground mb-2">Optional details</p>
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={400}
              placeholder="Add context to help moderation review this quickly"
              className="resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{details.length}/400</p>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="w-full h-11 font-display"
          >
            {submitting ? 'Submitting report...' : 'Submit report'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportScreen;
