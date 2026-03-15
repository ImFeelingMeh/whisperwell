-- Update get_and_claim_random to no longer claim questions
-- This allows multiple users to get and answer the same question
CREATE OR REPLACE FUNCTION public.get_and_claim_random()
RETURNS TABLE(question_id UUID, question_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_question_text TEXT;
BEGIN
  -- Get a random open question that:
  -- 1. Is not asked by the current user
  -- 2. Has fewer than 3 answers
  -- 3. User hasn't already answered it
  SELECT q.id, q.text INTO v_question_id, v_question_text
  FROM questions q
  WHERE (q.status = 'open' OR q.status = 'claimed')
    AND q.asker_id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.question_id = q.id
        AND a.responder_id = auth.uid()
    )
    AND (
      SELECT COUNT(*) FROM answers a2
      WHERE a2.question_id = q.id
    ) < 3
  ORDER BY random()
  LIMIT 1;
  
  RETURN QUERY SELECT v_question_id, v_question_text;
END;
$$;

-- Update submit_answer to handle concurrent answers
CREATE OR REPLACE FUNCTION public.submit_answer(p_qid UUID, p_text TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answer_count INTEGER;
  v_asker_id UUID;
BEGIN
  -- Verify the question exists and is not complete
  IF NOT EXISTS (
    SELECT 1 FROM questions
    WHERE id = p_qid
      AND status != 'complete'
      AND asker_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'You cannot answer this question.';
  END IF;
  
  -- Check if user already answered this question
  IF EXISTS (
    SELECT 1 FROM answers
    WHERE question_id = p_qid
      AND responder_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You have already answered this question.';
  END IF;
  
  -- Basic profanity filter
  IF p_text ~* '\y(fuck|shit|damn|asshole|bitch)\y' THEN
    RAISE EXCEPTION 'Please keep your answer kind and respectful.';
  END IF;
  
  -- Insert the answer
  INSERT INTO answers (question_id, responder_id, text)
  VALUES (p_qid, auth.uid(), p_text);
  
  -- Count total answers
  SELECT COUNT(*) INTO v_answer_count
  FROM answers
  WHERE question_id = p_qid;
  
  -- If we have 3 answers, mark as complete
  IF v_answer_count >= 3 THEN
    UPDATE questions
    SET status = 'complete', 
        completed_at = now(),
        claimed_by = NULL
    WHERE id = p_qid
    RETURNING asker_id INTO v_asker_id;
  END IF;
  
  RETURN true;
END;
$$;