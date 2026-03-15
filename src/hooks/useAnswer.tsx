import { useState, useEffect } from 'react';
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

  const getRandomQuestion = async () => {
    if (!userId) return;
    
    setLoading(true);
    const { data, error } = await supabase.rpc('get_and_claim_random');

    if (error) {
      console.error('Error claiming question:', error);
      toast({
        title: "Oops",
        description: "Could not find a whisper right now. Try again later.",
        variant: "destructive",
      });
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
  };
};
