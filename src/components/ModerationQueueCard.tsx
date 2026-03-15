import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ModerationItem {
  id: string;
  content_type: 'question' | 'answer';
  reason: string;
  source: 'auto_filter' | 'user_report' | 'crisis_signal';
  created_at: string;
}

interface ModerationQueueCardProps {
  items: ModerationItem[];
}

const ModerationQueueCard = ({ items }: ModerationQueueCardProps) => {
  return (
    <Card className="border bg-card/90 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-display text-muted-foreground">Moderation Queue</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open reports right now.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-background/70 p-2 text-xs">
              <p className="font-semibold text-foreground">
                {item.content_type === 'question' ? 'Whisper' : 'Response'} • {item.source.replace('_', ' ')}
              </p>
              <p className="text-muted-foreground">{item.reason}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ModerationQueueCard;
