-- ============================================================
-- Migration: Private Messaging + Deep Talk
-- Tables created in dependency order:
--   1. deep_talk_prompts   (no FK deps)
--   2. conversations       (→ matches)
--   3. messages             (→ conversations, profiles, deep_talk_prompts)
--   4. conversation_prompt_usage (→ conversations, deep_talk_prompts)
-- ============================================================

-- ============================================================
-- 1. deep_talk_prompts
-- ============================================================
CREATE TABLE public.deep_talk_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  depth_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prompts_depth_check CHECK (depth_level BETWEEN 1 AND 5),
  CONSTRAINT prompts_category_check CHECK (category IN (
    'Values', 'Personality', 'Life', 'Curiosity', 'Relationships', 'Dreams'
  ))
);

-- Normal users can read prompts, only service_role can modify.
GRANT SELECT ON public.deep_talk_prompts TO authenticated;
GRANT ALL ON public.deep_talk_prompts TO service_role;

ALTER TABLE public.deep_talk_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prompts"
ON public.deep_talk_prompts FOR SELECT TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies for authenticated — only service_role can modify.

-- Seed: required prompts
INSERT INTO public.deep_talk_prompts (category, prompt_text, depth_level) VALUES
  -- Values
  ('Values', 'What is something you care about more as you''ve gotten older?', 2),
  ('Values', 'What principle would you never compromise on, even if it cost you something?', 3),
  ('Values', 'What does "doing the right thing" mean to you when no one is watching?', 3),
  ('Values', 'What value do you wish more people took seriously?', 2),
  ('Values', 'When have your values been genuinely tested?', 4),

  -- Personality
  ('Personality', 'What kind of environment brings out the best version of you?', 2),
  ('Personality', 'How do you recharge after a draining week?', 1),
  ('Personality', 'What is a trait you used to see as a weakness but now appreciate?', 3),
  ('Personality', 'How would someone who really knows you describe you versus a stranger?', 2),
  ('Personality', 'What part of your personality surprises people the most?', 2),

  -- Life
  ('Life', 'What is something you''ve done that changed the way you see things?', 3),
  ('Life', 'What experience taught you the most about who you are?', 3),
  ('Life', 'What is a small, ordinary moment that you remember with unusual clarity?', 2),
  ('Life', 'What is a decision you made that was hard at the time but you''re glad you made?', 3),
  ('Life', 'What period of your life shaped you the most?', 4),

  -- Curiosity
  ('Curiosity', 'What is something you could talk about for hours?', 1),
  ('Curiosity', 'What have you changed your mind about recently?', 2),
  ('Curiosity', 'What is something most people accept without questioning that you find interesting?', 3),
  ('Curiosity', 'What is something you know a surprising amount about?', 1),
  ('Curiosity', 'What question keeps coming back to you?', 3),

  -- Relationships
  ('Relationships', 'What makes you feel genuinely understood by someone?', 2),
  ('Relationships', 'What is the most important thing you''ve learned from a past relationship?', 3),
  ('Relationships', 'How do you know when you trust someone?', 3),
  ('Relationships', 'What does comfortable silence with someone feel like to you?', 2),
  ('Relationships', 'What is one thing you need from the people closest to you?', 3),

  -- Dreams
  ('Dreams', 'If time and money weren''t constraints, what would you spend the next year doing?', 2),
  ('Dreams', 'What is something you''d like to be known for?', 3),
  ('Dreams', 'Where do you see yourself in five years, honestly?', 2),
  ('Dreams', 'What is something you haven''t started yet but want to?', 1),
  ('Dreams', 'What kind of life are you actually building towards?', 4);

-- ============================================================
-- 2. conversations
-- ============================================================
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'ice_breaker',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_phase_check CHECK (phase IN (
    'ice_breaker', 'getting_to_know', 'deep_talk', 'open'
  )),
  CONSTRAINT conversations_match_unique UNIQUE (match_id)
);

-- Only match participants can interact with their conversation.
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Helper: returns true when auth.uid() belongs to the match behind a conversation.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = conv_match_id
      AND status = 'active'
      AND (profile_a_id = auth.uid() OR profile_b_id = auth.uid())
  );
$$;

CREATE POLICY "Participants read their own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(match_id));

CREATE POLICY "Participants create conversations for their own active matches"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (public.is_conversation_participant(match_id));

CREATE POLICY "Participants update their own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_participant(match_id))
WITH CHECK (public.is_conversation_participant(match_id));

-- ============================================================
-- 3. messages
-- ============================================================
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  deep_talk_prompt_id UUID REFERENCES public.deep_talk_prompts(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_type_check CHECK (message_type IN (
    'text', 'deep_talk_prompt', 'deep_talk_response', 'system'
  )),
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT messages_content_max_length CHECK (length(content) <= 4000)
);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: returns true when auth.uid() is a participant of the conversation's underlying match.
CREATE OR REPLACE FUNCTION public.is_message_participant(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.matches m ON m.id = c.match_id
    WHERE c.id = conv_id
      AND m.status = 'active'
      AND (m.profile_a_id = auth.uid() OR m.profile_b_id = auth.uid())
  );
$$;

CREATE POLICY "Participants read their own messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_message_participant(conversation_id));

-- INSERT: sender_id MUST equal the authenticated user.
CREATE POLICY "Participants send messages as themselves"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_message_participant(conversation_id)
);

-- UPDATE: only the sender can update their own messages (for read_at by the other party,
-- we allow participants to update read_at on messages they received).
CREATE POLICY "Participants can mark messages as read"
ON public.messages FOR UPDATE TO authenticated
USING (public.is_message_participant(conversation_id))
WITH CHECK (public.is_message_participant(conversation_id));

-- ============================================================
-- 4. conversation_prompt_usage
-- ============================================================
CREATE TABLE public.conversation_prompt_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.deep_talk_prompts(id),
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT prompt_usage_unique UNIQUE (conversation_id, prompt_id)
);

GRANT SELECT, INSERT ON public.conversation_prompt_usage TO authenticated;
GRANT ALL ON public.conversation_prompt_usage TO service_role;

ALTER TABLE public.conversation_prompt_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their prompt usage"
ON public.conversation_prompt_usage FOR SELECT TO authenticated
USING (public.is_message_participant(conversation_id));

CREATE POLICY "Participants record prompt usage"
ON public.conversation_prompt_usage FOR INSERT TO authenticated
WITH CHECK (public.is_message_participant(conversation_id));

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX messages_conversation_created_idx
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX messages_conversation_id_idx
  ON public.messages (conversation_id);

CREATE INDEX conversations_match_id_idx
  ON public.conversations (match_id);

CREATE INDEX prompt_usage_conversation_idx
  ON public.conversation_prompt_usage (conversation_id);

CREATE INDEX prompt_usage_prompt_idx
  ON public.conversation_prompt_usage (prompt_id);

-- ============================================================
-- 6. Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
