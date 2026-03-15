-- WhisperWell MVP updates: reciprocity, safety, feed, reactions, and moderation queue

-- Questions metadata
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS emotion TEXT,
  ADD COLUMN IF NOT EXISTS vent_mode TEXT;

-- Daily mood check-ins
CREATE TABLE IF NOT EXISTS public.mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('good', 'okay', 'struggling')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mood_checkins' AND policyname = 'Users can insert own mood checkins'
  ) THEN
    CREATE POLICY "Users can insert own mood checkins"
      ON public.mood_checkins
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'mood_checkins' AND policyname = 'Users can read own mood checkins'
  ) THEN
    CREATE POLICY "Users can read own mood checkins"
      ON public.mood_checkins
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Reactions for received responses
CREATE TABLE IF NOT EXISTS public.response_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'relatable', 'encouraging')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (answer_id, user_id)
);

ALTER TABLE public.response_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'response_reactions' AND policyname = 'Users can manage own reactions'
  ) THEN
    CREATE POLICY "Users can manage own reactions"
      ON public.response_reactions
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Simple moderation queue
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('question', 'answer')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('auto_filter', 'user_report', 'crisis_signal')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'moderation_queue' AND policyname = 'Authenticated can view moderation queue'
  ) THEN
    CREATE POLICY "Authenticated can view moderation queue"
      ON public.moderation_queue
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Replace ask_question with reciprocity + safety support
DROP FUNCTION IF EXISTS public.ask_question(TEXT);
DROP FUNCTION IF EXISTS public.ask_question(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.ask_question(
  p_text TEXT,
  p_category TEXT DEFAULT NULL,
  p_emotion TEXT DEFAULT NULL,
  p_vent_mode TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_id UUID;
  v_active_count INTEGER;
  v_last_question_at TIMESTAMPTZ;
  v_responses_since_last INTEGER;
BEGIN
  IF p_text IS NULL OR length(trim(p_text)) = 0 THEN
    RAISE EXCEPTION 'Whisper cannot be empty.';
  END IF;

  IF length(trim(p_text)) > 300 THEN
    RAISE EXCEPTION 'Whisper must be 300 characters or less.';
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.questions
  WHERE asker_id = auth.uid()
    AND status IN ('open', 'claimed');

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You already have a whisper in the well.';
  END IF;

  SELECT MAX(created_at) INTO v_last_question_at
  FROM public.questions
  WHERE asker_id = auth.uid();

  SELECT COUNT(*) INTO v_responses_since_last
  FROM public.answers
  WHERE responder_id = auth.uid()
    AND created_at > COALESCE(v_last_question_at, to_timestamp(0));

  IF v_responses_since_last < 3 THEN
    RAISE EXCEPTION 'Before your whisper enters the well, help three others first.';
  END IF;

  IF p_text ~* '\y(kill yourself|go die|suicide methods|self-harm instructions|hate\s+\w+|racial slur|nazi|bully|harass)\y' THEN
    RAISE EXCEPTION 'Your whisper was blocked for safety. Please rewrite it in a kind and supportive way.';
  END IF;

  INSERT INTO public.questions (asker_id, text, status, category, emotion, vent_mode)
  VALUES (auth.uid(), trim(p_text), 'open', NULLIF(p_category, ''), NULLIF(p_emotion, ''), NULLIF(p_vent_mode, ''))
  RETURNING id INTO v_question_id;

  IF p_text ~* '\y(i want to disappear|i can\'t go on|self harm|hurt myself|end my life|want to die|suicidal)\y' THEN
    INSERT INTO public.moderation_queue (content_type, content_id, reason, source, details)
    VALUES ('question', v_question_id, 'possible crisis signal', 'crisis_signal', 'gentle outreach recommended');
  END IF;

  RETURN v_question_id;
END;
$$;

-- Ensure answer ordering exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'answers' AND column_name = 'answer_order'
  ) THEN
    ALTER TABLE public.answers ADD COLUMN answer_order INT;
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY created_at) AS rn
      FROM public.answers
    )
    UPDATE public.answers a
    SET answer_order = ranked.rn
    FROM ranked
    WHERE a.id = ranked.id;

    ALTER TABLE public.answers ALTER COLUMN answer_order SET NOT NULL;
  END IF;
END $$;

-- Replace submit_answer with limits + safety + queueing
DROP FUNCTION IF EXISTS public.submit_answer(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.submit_answer(p_qid UUID, p_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answer_count INT;
  v_order INT;
  v_answer_id UUID;
BEGIN
  IF p_text IS NULL OR length(trim(p_text)) = 0 THEN
    RAISE EXCEPTION 'Response cannot be empty.';
  END IF;

  IF length(trim(p_text)) > 250 THEN
    RAISE EXCEPTION 'Response must be 250 characters or less.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.questions
    WHERE id = p_qid
      AND status != 'complete'
      AND asker_id != auth.uid()
  ) THEN
    RAISE EXCEPTION 'You cannot answer this whisper.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.answers
    WHERE question_id = p_qid AND responder_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You have already answered this whisper.';
  END IF;

  IF p_text ~* '\y(kill yourself|go die|self-harm instructions|hate\s+\w+|racial slur|nazi|bully|harass)\y' THEN
    RAISE EXCEPTION 'Your response was blocked for safety. Please rewrite it in a kind and supportive way.';
  END IF;

  SELECT COUNT(*) + 1 INTO v_order
  FROM public.answers
  WHERE question_id = p_qid;

  INSERT INTO public.answers (question_id, responder_id, text, answer_order)
  VALUES (p_qid, auth.uid(), trim(p_text), v_order)
  RETURNING id INTO v_answer_id;

  IF p_text ~* '\y(drugs solve everything|just give up|nobody cares|hurt yourself)\y' THEN
    INSERT INTO public.moderation_queue (content_type, content_id, reason, source, details)
    VALUES ('answer', v_answer_id, 'harmful advice detected', 'auto_filter', 'safety review required');
  END IF;

  SELECT COUNT(*) INTO v_answer_count
  FROM public.answers
  WHERE question_id = p_qid;

  IF v_answer_count >= 3 THEN
    UPDATE public.questions
    SET status = 'complete', completed_at = now(), claimed_by = NULL, claimed_at = NULL
    WHERE id = p_qid;
  ELSE
    UPDATE public.questions
    SET status = 'open', claimed_by = NULL, claimed_at = NULL
    WHERE id = p_qid;
  END IF;
END;
$$;

-- Read reciprocity progress for current cycle
CREATE OR REPLACE FUNCTION public.get_reciprocity_progress()
RETURNS TABLE(responses_done INT, responses_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_question_at TIMESTAMPTZ;
  v_done INT;
BEGIN
  SELECT MAX(created_at) INTO v_last_question_at
  FROM public.questions
  WHERE asker_id = auth.uid();

  SELECT COUNT(*) INTO v_done
  FROM public.answers
  WHERE responder_id = auth.uid()
    AND created_at > COALESCE(v_last_question_at, to_timestamp(0));

  responses_done := LEAST(v_done, 3);
  responses_remaining := GREATEST(3 - v_done, 0);
  RETURN NEXT;
END;
$$;

-- Public feed function
CREATE OR REPLACE FUNCTION public.get_public_whispers(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  text TEXT,
  category TEXT,
  emotion TEXT,
  vent_mode TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  answer_count INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id,
    q.text,
    q.category,
    q.emotion,
    q.vent_mode,
    q.status,
    q.created_at,
    COALESCE((SELECT COUNT(*)::INT FROM public.answers a WHERE a.question_id = q.id), 0) AS answer_count
  FROM public.questions q
  WHERE q.status IN ('open', 'claimed')
  ORDER BY q.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
$$;

-- Detailed response chain for reactions/reporting
CREATE OR REPLACE FUNCTION public.get_final_chain(p_qid UUID)
RETURNS TABLE(answer_id UUID, answer_text TEXT, answer_order INT, my_reaction TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.questions
    WHERE id = p_qid AND asker_id = auth.uid() AND status = 'complete'
  ) THEN
    RAISE EXCEPTION 'Not authorized to view these responses.';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.text,
    a.answer_order,
    rr.reaction_type AS my_reaction
  FROM public.answers a
  LEFT JOIN public.response_reactions rr
    ON rr.answer_id = a.id AND rr.user_id = auth.uid()
  WHERE a.question_id = p_qid
  ORDER BY a.answer_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_response_reaction(p_answer_id UUID, p_reaction_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_reaction_type NOT IN ('helpful', 'relatable', 'encouraging') THEN
    RAISE EXCEPTION 'Invalid reaction type.';
  END IF;

  INSERT INTO public.response_reactions (answer_id, user_id, reaction_type)
  VALUES (p_answer_id, auth.uid(), p_reaction_type)
  ON CONFLICT (answer_id, user_id)
  DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.report_content(p_question_id UUID, p_answer_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.reports (reporter_id, question_id, answer_id, reason)
  VALUES (auth.uid(), p_question_id, p_answer_id, p_reason);

  INSERT INTO public.moderation_queue (content_type, content_id, reason, source, details)
  VALUES (
    CASE WHEN p_answer_id IS NOT NULL THEN 'answer' ELSE 'question' END,
    COALESCE(p_answer_id, p_question_id),
    COALESCE(NULLIF(trim(p_reason), ''), 'reported'),
    'user_report',
    'community report submitted'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ask_question(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reciprocity_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_whispers(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_final_chain(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_response_reaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_content(UUID, UUID, TEXT) TO authenticated;
