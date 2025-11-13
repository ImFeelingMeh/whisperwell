import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  text: string;
  status: 'open' | 'claimed' | 'complete';
  created_at: string;
  completed_at: string | null;
}

interface Answer {
  answer_text: string;
  answer_order: number;
}

export const useQuestion = (userId: string | undefined) => {
  const [myQuestion, setMyQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMyQuestion = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('asker_id', userId)
      .in('status', ['open', 'claimed', 'complete'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching question:', error);
      return;
    }

    setMyQuestion(data as Question | null);
    
    // If complete, fetch the final chain
    if (data && data.status === 'complete') {
      await fetchFinalChain(data.id);
    }
    
    setLoading(false);
  };

  const fetchFinalChain = async (questionId: string) => {
    const { data, error } = await supabase.rpc('get_final_chain', {
      p_qid: questionId
    });

    if (error) {
      console.error('Error fetching answers:', error);
      return;
    }

    setAnswers(data || []);
  };

  const askQuestion = async (text: string) => {
    const { data, error } = await supabase.rpc('ask_question', {
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

    await fetchMyQuestion();
    return { data, error: null };
  };

  useEffect(() => {
    if (userId) {
      fetchMyQuestion();

      // Subscribe to realtime updates for questions
      const channel = supabase
        .channel('question-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'questions',
            filter: `asker_id=eq.${userId}`
          },
          () => {
            fetchMyQuestion();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  return {
    myQuestion,
    answers,
    loading,
    askQuestion,
    refetch: fetchMyQuestion,
  };
};
