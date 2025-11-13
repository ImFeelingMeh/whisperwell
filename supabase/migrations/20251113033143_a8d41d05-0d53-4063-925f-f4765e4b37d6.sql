-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'complete')),
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Create answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Create reports table for moderation
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('question', 'answer')),
  content_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at)
  VALUES (new.id, new.raw_user_meta_data->>'username', now());
  RETURN new;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for questions
CREATE POLICY "Users can view open questions" ON public.questions
  FOR SELECT USING (status = 'open' OR asker_id = auth.uid());

CREATE POLICY "Users can view their own questions" ON public.questions
  FOR SELECT USING (asker_id = auth.uid());

-- RLS Policies for answers (very restrictive - only via RPCs)
CREATE POLICY "No direct select on answers" ON public.answers
  FOR SELECT USING (false);

-- RLS Policies for reports
CREATE POLICY "Users can insert reports" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Function: ask_question
CREATE OR REPLACE FUNCTION public.ask_question(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_active_count INTEGER;
BEGIN
  -- Check if user already has an active question
  SELECT COUNT(*) INTO v_active_count
  FROM questions
  WHERE asker_id = auth.uid()
    AND status IN ('open', 'claimed');
  
  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You already have a question in the Well. Wait for three voices to answer.';
  END IF;
  
  -- Basic profanity filter (simple word list)
  IF p_text ~* '\y(fuck|shit|damn|asshole|bitch)\y' THEN
    RAISE EXCEPTION 'Please keep your question kind and respectful.';
  END IF;
  
  -- Insert the question
  INSERT INTO questions (asker_id, text, status)
  VALUES (auth.uid(), p_text, 'open')
  RETURNING id INTO v_question_id;
  
  RETURN v_question_id;
END;
$$;

-- Function: get_and_claim_random
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
  -- Reset stale claims (older than 10 minutes)
  UPDATE questions
  SET status = 'open', claimed_by = NULL, claimed_at = NULL
  WHERE status = 'claimed' 
    AND claimed_at < now() - interval '10 minutes';
  
  -- Get a random open question that:
  -- 1. Is not asked by the current user
  -- 2. Has not been answered by the current user
  -- 3. Is not currently claimed (or claim expired)
  SELECT q.id, q.text INTO v_question_id, v_question_text
  FROM questions q
  WHERE q.status = 'open'
    AND q.asker_id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM answers a
      WHERE a.question_id = q.id
        AND a.responder_id = auth.uid()
    )
  ORDER BY random()
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_question_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Claim the question
  UPDATE questions
  SET status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  WHERE id = v_question_id;
  
  RETURN QUERY SELECT v_question_id, v_question_text;
END;
$$;

-- Function: submit_answer
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
  -- Verify the question is claimed by this user or is open
  IF NOT EXISTS (
    SELECT 1 FROM questions
    WHERE id = p_qid
      AND (claimed_by = auth.uid() OR status = 'open')
      AND status != 'complete'
  ) THEN
    RAISE EXCEPTION 'You cannot answer this question.';
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
  ELSE
    -- Otherwise just unclaim it
    UPDATE questions
    SET status = 'open', claimed_by = NULL, claimed_at = NULL
    WHERE id = p_qid;
  END IF;
  
  RETURN true;
END;
$$;

-- Function: get_final_chain (for asker to retrieve their completed answers)
CREATE OR REPLACE FUNCTION public.get_final_chain(p_qid UUID)
RETURNS TABLE(answer_text TEXT, answer_order INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is the asker
  IF NOT EXISTS (
    SELECT 1 FROM questions
    WHERE id = p_qid
      AND asker_id = auth.uid()
      AND status = 'complete'
  ) THEN
    RAISE EXCEPTION 'You cannot view these answers.';
  END IF;
  
  -- Return the three answers in order of creation
  RETURN QUERY
  SELECT a.text, ROW_NUMBER() OVER (ORDER BY a.created_at)::INTEGER
  FROM answers a
  WHERE a.question_id = p_qid
  ORDER BY a.created_at
  LIMIT 3;
END;
$$;

-- Enable realtime for questions table
ALTER PUBLICATION supabase_realtime ADD TABLE questions;