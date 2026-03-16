import React from 'react';
import { CATEGORIES, EMOTIONS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FeedWhisper {
  id: string;
  asker_id?: string;
  text: string;
  category: string | null;
  emotion: string | null;
}

interface VoicesFromWellProps {
  whispers: FeedWhisper[];
  onRespond: (whisper: FeedWhisper) => void;
  onReport: (questionId: string) => void;
}

const VoicesFromWell = ({ whispers, onRespond, onReport }: VoicesFromWellProps) => {
  return (
    <Card className="border shadow-sm bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display text-primary">Voices from the Well</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
          {whispers.length === 0 && (
            <p className="text-sm text-muted-foreground">The well is quiet right now.</p>
          )}

          {whispers.map((whisper) => {
            const emotion = whisper.emotion
              ? EMOTIONS.find((item) => item.value === whisper.emotion)
              : null;
            const category = whisper.category
              ? CATEGORIES.find((item) => item.value === whisper.category)
              : null;

            return (
              <div key={whisper.id} className="rounded-xl border bg-background/70 p-3 space-y-2">
                <p className="text-sm leading-relaxed">{whisper.text}</p>
                <div className="flex flex-wrap gap-2">
                  {emotion && (
                    <span className="emotion-tag bg-lavender/20 text-accent-foreground">
                      {emotion.label}
                    </span>
                  )}
                  {category && (
                    <span className="emotion-tag bg-primary/10 text-primary">
                      {category.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="outline" onClick={() => onRespond(whisper)}>
                    Respond
                  </Button>
                  <button
                    onClick={() => onReport(whisper.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default VoicesFromWell;
