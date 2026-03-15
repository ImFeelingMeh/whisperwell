import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMoodCheckin = (userId: string | undefined) => {
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayMood = async () => {
    if (!userId) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('mood_checkins')
      .select('mood')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setTodayMood(data?.mood || null);
    setLoading(false);
  };

  const submitMood = async (mood: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('mood_checkins')
      .insert({ user_id: userId, mood });

    if (!error) {
      setTodayMood(mood);
    }
  };

  useEffect(() => {
    fetchTodayMood();
  }, [userId]);

  return { todayMood, loading, submitMood };
};
