-- ============================================================
-- Migration: Safety & Privacy Controls (User Blocks & Reports)
-- Tables:
--   1. user_blocks   (bidirectional communication & discovery block)
--   2. user_reports  (confidential safety & conduct reporting)
-- ============================================================

-- ============================================================
-- 1. user_blocks
-- ============================================================
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT user_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX user_blocks_blocker_idx ON public.user_blocks (blocker_id);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks (blocked_id);
CREATE INDEX user_blocks_pair_idx ON public.user_blocks (blocker_id, blocked_id);

GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can only see the blocks they created themselves.
CREATE POLICY "Users read their own blocks"
ON public.user_blocks FOR SELECT TO authenticated
USING (blocker_id = auth.uid());

-- Users can only insert block records where they are the blocker.
CREATE POLICY "Users create their own blocks"
ON public.user_blocks FOR INSERT TO authenticated
WITH CHECK (
  blocker_id = auth.uid()
  AND blocker_id <> blocked_id
);

-- Users can only delete (unblock) records they created.
CREATE POLICY "Users delete their own blocks"
ON public.user_blocks FOR DELETE TO authenticated
USING (blocker_id = auth.uid());

-- No UPDATE policy: block records are immutable (either exist or deleted).

-- ============================================================
-- 2. user_reports
-- ============================================================
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_not_self CHECK (reporter_id <> reported_user_id),
  CONSTRAINT user_reports_reason_check CHECK (reason IN (
    'Harassment', 'Spam', 'Fake profile', 'Inappropriate content', 'Unsafe behaviour', 'Other'
  )),
  CONSTRAINT user_reports_status_check CHECK (status IN (
    'pending', 'investigating', 'resolved', 'dismissed'
  )),
  CONSTRAINT user_reports_desc_length CHECK (description IS NULL OR length(description) <= 2000)
);

CREATE INDEX user_reports_reporter_idx ON public.user_reports (reporter_id);
CREATE INDEX user_reports_reported_idx ON public.user_reports (reported_user_id);
CREATE INDEX user_reports_conversation_idx ON public.user_reports (conversation_id);

GRANT INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can submit reports with themselves as the reporter.
CREATE POLICY "Users can create reports"
ON public.user_reports FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND reporter_id <> reported_user_id
);

-- Note: Normal authenticated users have NO SELECT, UPDATE, or DELETE policies.
-- Reports and moderation status are strictly confidential and accessible only to service_role.

-- ============================================================
-- 3. Update conversation & message participant RLS checks
--    to automatically reject if either user has blocked the other.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_blocked_between(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_match_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = conv_match_id
      AND m.status = 'active'
      AND (m.profile_a_id = auth.uid() OR m.profile_b_id = auth.uid())
      AND NOT public.is_blocked_between(m.profile_a_id, m.profile_b_id)
  );
$$;

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
      AND NOT public.is_blocked_between(m.profile_a_id, m.profile_b_id)
  );
$$;
