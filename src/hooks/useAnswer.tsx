import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClaimedQuestion {
  question_id: string;
  question_text: string;
}

export const useAnswer = (userId: string | undefined) => {
  const [claimedQuestion, setClaimedQuestion] = useState<ClaimedQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getRandomQuestion = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase.rpc('get_and_claim_random');

    if (error) {
      console.error('Error claiming question:', error);
      toast({
        title: "Oops",
        description: "Could not find a question right now. Try again later.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setClaimedQuestion(data[0]);
    } else {
      setClaimedQuestion(null);
    }
    
    setLoading(false);
  };

  const submitAnswer = async (text: string) => {
    if (!claimedQuestion) return;

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

    // Clear the current question and fetch a new one
    setClaimedQuestion(null);
    await getRandomQuestion();
    
    return { error: null };
  };

  useEffect(() => {
    if (userId) {
      getRandomQuestion();

      // Subscribe to realtime updates for new questions
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
            // When questions change, try to get a new one if we don't have one
            if (!claimedQuestion || payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new.status === 'open')) {
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
  };
};
