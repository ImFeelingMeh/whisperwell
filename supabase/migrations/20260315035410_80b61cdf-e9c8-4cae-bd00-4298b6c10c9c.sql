
DROP FUNCTION IF EXISTS public.get_and_claim_random();

CREATE OR REPLACE FUNCTION public.get_and_claim_random()
  RETURNS TABLE(question_id uuid, question_text text, question_category text, question_emotion text, question_vent_mode text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_qid UUID;
  v_text TEXT;
  v_category TEXT;
  v_emotion TEXT;
  v_vent_mode TEXT;
BEGIN
  UPDATE questions
  SET status = 'open', claimed_by = NULL, claimed_at = NULL
  WHERE status = 'claimed'
    AND claimed_at < now() - INTERVAL '10 minutes';

  SELECT q.id, q.text, q.category, q.emotion, q.vent_mode 
  INTO v_qid, v_text, v_category, v_emotion, v_vent_mode
  FROM questions q
  WHERE q.status = 'open'
    AND q.asker_id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM answers a WHERE a.question_id = q.id AND a.responder_id = auth.uid()
    )
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_qid IS NULL THEN
    RETURN;
  END IF;

  UPDATE questions
  SET status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_qid;

  question_id := v_qid;
  question_text := v_text;
  question_category := v_category;
  question_emotion := v_emotion;
  question_vent_mode := v_vent_mode;
  RETURN NEXT;
END;
$$;
