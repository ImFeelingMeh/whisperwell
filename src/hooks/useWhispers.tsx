import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedWhisper {
  id: string;
  asker_id?: string;
  text: string;
  category: string | null;
  emotion: string | null;
  vent_mode: string | null;
  status: string;
  created_at: string;
  answer_count: number;
}

interface ModerationItem {
  id: string;
  content_type: 'question' | 'answer';
  reason: string;
  source: 'auto_filter' | 'user_report' | 'crisis_signal';
  status: 'open' | 'reviewed' | 'resolved';
  created_at: string;
}

export const useWhispers = (userId: string | undefined) => {
  const [feed, setFeed] = useState<FeedWhisper[]>([]);
  const [responsesDone, setResponsesDone] = useState(0);
  const [responsesRemaining, setResponsesRemaining] = useState(0);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_public_whispers' as any, { p_limit: 25 } as any);

    if (!error) {
      setFeed((data || []) as FeedWhisper[]);
      return;
    }

    const fallback = await supabase
      .from('questions')
      .select('id, asker_id, text, category, emotion, vent_mode, status, created_at')
      .in('status', ['open', 'claimed'])
      .neq('asker_id', userId as any)
      .order('created_at', { ascending: false })
      .limit(25);

    const rows = (fallback.data || []).map((row: any) => ({
      ...row,
      answer_count: 0,
    })) as FeedWhisper[];

    setFeed(rows);
  }, []);

  const fetchReciprocity = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase.rpc('get_reciprocity_progress' as any);

    if (error) {
      const { data: latestQuestion } = await supabase
        .from('questions')
        .select('created_at')
        .eq('asker_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestQuestion?.created_at) {
        setResponsesDone(0);
        setResponsesRemaining(0);
        return;
      }

      const { count } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('responder_id', userId)
        .gt('created_at', latestQuestion.created_at);

      const done = Math.min(count || 0, 3);
      setResponsesDone(done);
      setResponsesRemaining(Math.max(3 - done, 0));
      return;
    }

    const progress = data?.[0];

    setResponsesDone(progress?.responses_done ?? 0);
    setResponsesRemaining(progress?.responses_remaining ?? 0);
  }, [userId]);

  const fetchModerationQueue = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('moderation_queue' as any)
      .select('id, content_type, reason, source, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      setModerationQueue([]);
      return;
    }

    setModerationQueue(((data || []) as unknown) as ModerationItem[]);
  }, []);

  const reportQuestion = async (questionId: string, reason: string) => {
    return supabase.rpc('report_content' as any, {
      p_question_id: questionId,
      p_answer_id: null,
      p_reason: reason,
    } as any);
  };

  const reportAnswer = async (answerId: string, reason: string) => {
    return supabase.rpc('report_content' as any, {
      p_question_id: null,
      p_answer_id: answerId,
      p_reason: reason,
    } as any);
  };

  const reactToAnswer = async (answerId: string, reactionType: string) => {
    return supabase.rpc('add_response_reaction' as any, {
      p_answer_id: answerId,
      p_reaction_type: reactionType,
    } as any);
  };

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFeed(), fetchReciprocity(), fetchModerationQueue()]);
    setLoading(false);
  }, [fetchFeed, fetchReciprocity, fetchModerationQueue]);

  useEffect(() => {
    if (!userId) return;

    refreshAll();

    const channel = supabase
      .channel('community-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, refreshAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, fetchModerationQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshAll, fetchModerationQueue]);

  return {
    feed,
    responsesDone,
    responsesRemaining,
    moderationQueue,
    loading,
    refreshAll,
    fetchReciprocity,
    reportQuestion,
    reportAnswer,
    reactToAnswer,
  };
};
