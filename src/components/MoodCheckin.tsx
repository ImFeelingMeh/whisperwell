import { useMoodCheckin } from '@/hooks/useMoodCheckin';
import { MOODS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

interface MoodCheckinProps {
  userId: string;
}

const MoodCheckin = ({ userId }: MoodCheckinProps) => {
  const { todayMood, loading, submitMood } = useMoodCheckin(userId);

  if (loading) return null;

  return (
    <Card className="border bg-card/80 shadow-sm animate-fade-in-up">
      <CardContent className="pt-5 pb-4">
        <p className="text-sm font-display font-semibold text-muted-foreground mb-3 text-center">
          How are you feeling today?
        </p>
        <div className="flex justify-center gap-4">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => submitMood(mood.value)}
              className={`mood-btn ${todayMood === mood.value ? 'selected' : 'border-border bg-card hover:border-muted-foreground/30'}`}
            >
              <span className="text-2xl">{mood.emoji}</span>
              <span className="text-xs font-medium text-muted-foreground">{mood.label}</span>
            </button>
          ))}
        </div>
        {todayMood && (
          <p className="text-xs text-muted-foreground text-center mt-3 animate-fade-in-up">
            Thanks for checking in 💛
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MoodCheckin;
