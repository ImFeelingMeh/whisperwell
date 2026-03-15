
-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view open questions"
  ON public.questions FOR SELECT
  TO authenticated
  USING (status = 'open' OR asker_id = auth.uid() OR claimed_by = auth.uid());

-- 3. Answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  answer_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- No direct access to answers - only via RPCs
CREATE POLICY "No direct select on answers"
  ON public.answers FOR SELECT
  TO authenticated
  USING (false);

-- 4. Reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES public.answers(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- 5. RPC: ask_question
CREATE OR REPLACE FUNCTION public.ask_question(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing INT;
  v_id UUID;
BEGIN
  -- Check if user already has an active question
  SELECT COUNT(*) INTO v_existing
  FROM questions
  WHERE asker_id = auth.uid()
    AND status IN ('open', 'claimed');

  IF v_existing > 0 THEN
    RAISE EXCEPTION 'You already have an active question in the well.';
  END IF;

  INSERT INTO questions (asker_id, text, status)
  VALUES (auth.uid(), p_text, 'open')
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 6. RPC: get_and_claim_random
CREATE OR REPLACE FUNCTION public.get_and_claim_random()
RETURNS TABLE(question_id UUID, question_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qid UUID;
  v_text TEXT;
BEGIN
  -- Reset stale claims (>10 min old)
  UPDATE questions
  SET status = 'open', claimed_by = NULL, claimed_at = NULL
  WHERE status = 'claimed'
    AND claimed_at < now() - INTERVAL '10 minutes';

  -- Find a random open question not from caller and not previously answered by caller
  SELECT q.id, q.text INTO v_qid, v_text
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

  -- Claim it
  UPDATE questions
  SET status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_qid;

  question_id := v_qid;
  question_text := v_text;
  RETURN NEXT;
END;
$$;

-- 7. RPC: submit_answer
CREATE OR REPLACE FUNCTION public.submit_answer(p_qid UUID, p_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
  v_order INT;
BEGIN
  -- Verify the question is claimed by this user
  IF NOT EXISTS (
    SELECT 1 FROM questions WHERE id = p_qid AND claimed_by = auth.uid() AND status = 'claimed'
  ) THEN
    RAISE EXCEPTION 'You are not authorized to answer this question.';
  END IF;

  -- Determine answer order
  SELECT COUNT(*) + 1 INTO v_order FROM answers WHERE question_id = p_qid;

  -- Insert answer
  INSERT INTO answers (question_id, responder_id, text, answer_order)
  VALUES (p_qid, auth.uid(), p_text, v_order);

  -- Check total answers
  SELECT COUNT(*) INTO v_count FROM answers WHERE question_id = p_qid;

  IF v_count >= 3 THEN
    UPDATE questions SET status = 'complete', completed_at = now(), claimed_by = NULL, claimed_at = NULL
    WHERE id = p_qid;
  ELSE
    UPDATE questions SET status = 'open', claimed_by = NULL, claimed_at = NULL
    WHERE id = p_qid;
  END IF;
END;
$$;

-- 8. RPC: get_final_chain
CREATE OR REPLACE FUNCTION public.get_final_chain(p_qid UUID)
RETURNS TABLE(answer_text TEXT, answer_order INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the asker and question is complete
  IF NOT EXISTS (
    SELECT 1 FROM questions WHERE id = p_qid AND asker_id = auth.uid() AND status = 'complete'
  ) THEN
    RAISE EXCEPTION 'Not authorized to view these answers.';
  END IF;

  RETURN QUERY
  SELECT a.text AS answer_text, a.answer_order
  FROM answers a
  WHERE a.question_id = p_qid
  ORDER BY a.answer_order;
END;
$$;

-- Enable realtime for questions
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
