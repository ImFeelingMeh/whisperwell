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
    }
  }, [userId]);

  return {
    claimedQuestion,
    loading,
    submitAnswer,
    getRandomQuestion,
  };
};
