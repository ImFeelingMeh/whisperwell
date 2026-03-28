import { useMoodCheckin } from '@/hooks/useMoodCheckin';
import { MOODS } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface MoodCheckinProps {
  userId: string;
}

const MoodCheckin = ({ userId }: MoodCheckinProps) => {
  const { todayMood, loading, saving, lastSaveSource, submitMood } = useMoodCheckin(userId);
  const { toast } = useToast();

  const handleMoodClick = async (mood: string) => {
    const { error } = await submitMood(mood);

    if (error) {
      toast({
        title: 'Saved on this device',
        description: 'Could not sync check-in to Supabase yet. You can still continue safely.',
      });
      return;
    }

    toast({
      title: 'Check-in saved',
      description: 'Thanks for sharing how today feels.',
    });
  };

  if (loading) return null;

  return (
    <Card className="panel-surface animate-fade-in-up">
      <CardContent className="pt-5 pb-5">
        <p className="section-heading mb-1 text-center">Check-in</p>
        <p className="text-sm font-display font-semibold text-muted-foreground mb-4 text-center">
          How are you feeling today?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodClick(mood.value)}
              disabled={saving}
              className={`mood-btn w-full ${todayMood === mood.value ? 'selected' : 'border-border bg-card hover:border-muted-foreground/30'}`}
            >
              <span className="text-[13px] font-semibold text-muted-foreground">{mood.label}</span>
            </button>
          ))}
        </div>
        {todayMood && (
          <p className="text-xs text-muted-foreground text-center mt-3 animate-fade-in-up">
            You checked in as <span className="font-semibold text-foreground">{todayMood}</span> today
            {lastSaveSource === 'local' ? ' (saved locally).' : '.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MoodCheckin;
