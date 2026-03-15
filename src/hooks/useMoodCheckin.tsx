import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMoodCheckin = (userId: string | undefined) => {
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getLocalMoodKey = () => {
    return `whisperwell:mood:${userId || 'guest'}:${getTodayKey()}`;
  };

  const fetchTodayMood = async () => {
    setLoading(true);

    const localMood = localStorage.getItem(getLocalMoodKey());
    if (localMood) {
      setTodayMood(localMood);
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('mood_checkins' as any)
        .select('mood')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && (data as any)?.mood) {
        const mood = (data as any).mood as string;
        setTodayMood(mood);
        localStorage.setItem(getLocalMoodKey(), mood);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitMood = async (mood: string) => {
    setTodayMood(mood);
    localStorage.setItem(getLocalMoodKey(), mood);

    if (!userId) return;

    await supabase
      .from('mood_checkins' as any)
      .insert({ user_id: userId, mood } as any);
  };

  useEffect(() => {
    fetchTodayMood();
  }, [userId]);

  return { todayMood, loading, submitMood };
};
