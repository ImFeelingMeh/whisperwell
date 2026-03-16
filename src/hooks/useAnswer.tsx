import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClaimedQuestion {
  question_id: string;
  question_text: string;
  question_category: string | null;
  question_emotion: string | null;
  question_vent_mode: string | null;
}

export const useAnswer = (userId: string | undefined) => {
  const [claimedQuestion, setClaimedQuestion] = useState<ClaimedQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const manualPinnedRef = useRef(false);

  const getRandomQuestionFallback = async () => {
    if (!userId) {
      setClaimedQuestion(null);
      return;
    }

    const answered = await supabase
      .from('answers')
      .select('question_id')
      .eq('responder_id', userId);

    const answeredIds = new Set((answered.data || []).map((item: any) => item.question_id));

    const { data } = await supabase
      .from('questions')
      .select('id, text, category, emotion, vent_mode, status')
      .in('status', ['open', 'claimed'])
      .neq('asker_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    const candidates = (data || []).filter((row: any) => !answeredIds.has(row.id));

    if (candidates.length === 0) {
      setClaimedQuestion(null);
      return;
    }

    const picked = candidates[Math.floor(Math.random() * candidates.length)] as any;
    setClaimedQuestion({
      question_id: picked.id,
      question_text: picked.text,
      question_category: picked.category ?? null,
      question_emotion: picked.emotion ?? null,
      question_vent_mode: picked.vent_mode ?? null,
    });
  };

  const getRandomQuestion = async () => {
    if (!userId) return;
    if (manualPinnedRef.current) return;
    
    setLoading(true);
    const { data, error } = await supabase.rpc('get_and_claim_random');

    if (error) {
      const missingRpc = /get_and_claim_random|function|schema cache|404|not found/i.test(error.message);

      if (missingRpc) {
        await getRandomQuestionFallback();
      } else {
        console.error('Error claiming question:', error);
        toast({
          title: 'Oops',
          description: 'Could not find a whisper right now. Try again later.',
          variant: 'destructive',
        });
      }

      setLoading(false);
      return;
    }

    if (manualPinnedRef.current) {
      setLoading(false);
      return;
    }

    if (data && data.length > 0 && data[0].question_text?.trim()) {
      setClaimedQuestion(data[0] as ClaimedQuestion);
    } else {
      setClaimedQuestion(null);
    }
    
    setLoading(false);
  };

  const submitAnswer = async (text: string) => {
    if (!claimedQuestion) return { error: new Error('No question') };

    const { error } = await supabase.rpc('submit_answer', {
      p_qid: claimedQuestion.question_id,
      p_text: text
    });

    if (error) {
      toast({
        title: "Oops",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    setClaimedQuestion(null);
    await getRandomQuestion();
    
    return { error: null };
  };

  const setManualQuestion = useCallback((question: ClaimedQuestion | null) => {
    manualPinnedRef.current = !!question;
    setClaimedQuestion(question);
  }, []);

  useEffect(() => {
    if (userId) {
      getRandomQuestion();

      const channel = supabase
        .channel('answer-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'questions'
          },
          (payload) => {
            if (!claimedQuestion || payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && (payload.new as any).status === 'open')) {
              getRandomQuestion();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  return {
    claimedQuestion,
    loading,
    submitAnswer,
    getRandomQuestion,
    setManualQuestion,
  };
};
