import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMoodCheckin = (userId: string | undefined) => {
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaveSource, setLastSaveSource] = useState<'remote' | 'local' | null>(null);

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
      const todayKey = getTodayKey();

      const { data, error } = await supabase
        .from('mood_checkins' as any)
        .select('mood, created_at, checkin_date')
        .eq('user_id', userId)
        .eq('checkin_date', todayKey)
        .maybeSingle();

      if (!error && (data as any)?.mood) {
        const mood = (data as any).mood as string;
        setTodayMood(mood);
        localStorage.setItem(getLocalMoodKey(), mood);
        setLastSaveSource('remote');
      }
    } catch {
      setLastSaveSource(localMood ? 'local' : null);
    } finally {
      setLoading(false);
    }
  };

  const submitMood = async (mood: string) => {
    setSaving(true);
    setTodayMood(mood);
    localStorage.setItem(getLocalMoodKey(), mood);
    setLastSaveSource('local');

    if (!userId) {
      setSaving(false);
      return { error: null };
    }

    const todayKey = getTodayKey();

    const existing = await supabase
      .from('mood_checkins' as any)
      .select('id')
      .eq('user_id', userId)
      .eq('checkin_date', todayKey)
      .maybeSingle();

    if (existing.error) {
      setSaving(false);
      return { error: existing.error };
    }

    const writeResult = existing.data?.id
      ? await supabase
          .from('mood_checkins' as any)
          .update({ mood } as any)
          .eq('id', existing.data.id)
      : await supabase
      .from('mood_checkins' as any)
      .insert({ user_id: userId, mood, checkin_date: todayKey } as any);

    if (!writeResult.error) {
      setLastSaveSource('remote');
      setSaving(false);
      return { error: null };
    }

    setSaving(false);
    return { error: writeResult.error };
  };

  useEffect(() => {
    fetchTodayMood();
  }, [userId]);

  return { todayMood, loading, saving, lastSaveSource, submitMood };
};
