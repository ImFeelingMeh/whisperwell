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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = getTodayKey();

      const { data, error } = await supabase
        .from('mood_checkins' as any)
        .select('mood, created_at, checkin_date')
        .eq('user_id', userId)
        .or(`checkin_date.eq.${todayKey},created_at.gte.${today.toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(1)
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

    const upsertAttempt = await supabase
      .from('mood_checkins' as any)
      .upsert(
        { user_id: userId, mood, checkin_date: todayKey } as any,
        { onConflict: 'user_id,checkin_date' } as any,
      );

    if (!upsertAttempt.error) {
      setLastSaveSource('remote');
      setSaving(false);
      return { error: null };
    }

    const insertFallback = await supabase
      .from('mood_checkins' as any)
      .insert({ user_id: userId, mood } as any);

    if (!insertFallback.error) {
      setLastSaveSource('remote');
      setSaving(false);
      return { error: null };
    }

    setSaving(false);
    return { error: insertFallback.error };
  };

  useEffect(() => {
    fetchTodayMood();
  }, [userId]);

  return { todayMood, loading, saving, lastSaveSource, submitMood };
};
