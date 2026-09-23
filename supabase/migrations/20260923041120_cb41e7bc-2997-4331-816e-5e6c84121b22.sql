CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  a_seen_at TIMESTAMPTZ,
  b_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_status_check CHECK (status IN ('active', 'unmatched')),
  CONSTRAINT matches_pair_order_check CHECK (profile_a_id < profile_b_id),
  CONSTRAINT matches_unique_pair UNIQUE (profile_a_id, profile_b_id)
);

CREATE INDEX matches_profile_a_idx ON public.matches (profile_a_id, status);
CREATE INDEX matches_profile_b_idx ON public.matches (profile_b_id, status);

GRANT SELECT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read their own connections"
ON public.matches FOR SELECT TO authenticated
USING (auth.uid() = profile_a_id OR auth.uid() = profile_b_id);

CREATE POLICY "Participants update their own connections"
ON public.matches FOR UPDATE TO authenticated
USING (auth.uid() = profile_a_id OR auth.uid() = profile_b_id)
WITH CHECK (auth.uid() = profile_a_id OR auth.uid() = profile_b_id);

CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();