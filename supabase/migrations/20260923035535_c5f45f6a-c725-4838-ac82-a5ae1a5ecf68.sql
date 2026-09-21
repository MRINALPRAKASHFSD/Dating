CREATE TABLE public.profile_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('interested','passed','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_interests_unique_pair UNIQUE (from_profile_id, to_profile_id),
  CONSTRAINT profile_interests_no_self CHECK (from_profile_id <> to_profile_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_interests TO authenticated;
GRANT ALL ON public.profile_interests TO service_role;

ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own outgoing interests"
  ON public.profile_interests FOR SELECT TO authenticated
  USING (auth.uid() = from_profile_id);

CREATE POLICY "Members create their own outgoing interests"
  ON public.profile_interests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_profile_id AND from_profile_id <> to_profile_id);

CREATE POLICY "Members update their own outgoing interests"
  ON public.profile_interests FOR UPDATE TO authenticated
  USING (auth.uid() = from_profile_id)
  WITH CHECK (auth.uid() = from_profile_id);

CREATE POLICY "Members delete their own outgoing interests"
  ON public.profile_interests FOR DELETE TO authenticated
  USING (auth.uid() = from_profile_id);

CREATE INDEX idx_profile_interests_from ON public.profile_interests (from_profile_id, status);
CREATE INDEX idx_profile_interests_to ON public.profile_interests (to_profile_id, status);

CREATE TRIGGER update_profile_interests_updated_at
  BEFORE UPDATE ON public.profile_interests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();