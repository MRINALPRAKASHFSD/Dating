CREATE TABLE public.profile_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  min_age INTEGER NOT NULL DEFAULT 18,
  max_age INTEGER NOT NULL DEFAULT 99,
  max_distance_km INTEGER,
  preferred_genders TEXT[] NOT NULL DEFAULT '{}'::text[],
  relationship_intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_preferences_age_range_check CHECK (min_age >= 18 AND max_age <= 120 AND min_age <= max_age),
  CONSTRAINT profile_preferences_distance_check CHECK (max_distance_km IS NULL OR max_distance_km > 0),
  CONSTRAINT profile_preferences_intent_check CHECK (
    relationship_intent IS NULL OR relationship_intent IN (
      'long_term_relationship', 'serious_dating', 'open_to_seeing', 'friendship_first'
    )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_preferences TO authenticated;
GRANT ALL ON public.profile_preferences TO service_role;

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_preferences_select_own ON public.profile_preferences
  FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY profile_preferences_insert_own ON public.profile_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY profile_preferences_update_own ON public.profile_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY profile_preferences_delete_own ON public.profile_preferences
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

CREATE TRIGGER set_profile_preferences_updated_at
  BEFORE UPDATE ON public.profile_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_profile_preferences_profile_id ON public.profile_preferences (profile_id);
CREATE INDEX idx_profiles_matching ON public.profiles (onboarding_completed, gender, age);
CREATE INDEX idx_profiles_city ON public.profiles (lower(city));