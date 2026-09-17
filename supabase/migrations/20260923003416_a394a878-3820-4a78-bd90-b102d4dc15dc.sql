
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  age INTEGER CHECK (age IS NULL OR (age >= 18 AND age <= 120)),
  city TEXT,
  gender TEXT,
  looking_for TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hobbies TO authenticated;
GRANT ALL ON public.hobbies TO service_role;
ALTER TABLE public.hobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hobbies_read" ON public.hobbies FOR SELECT TO authenticated USING (true);
CREATE INDEX hobbies_category_idx ON public.hobbies (category);

CREATE TABLE public.profile_hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hobby_id UUID NOT NULL REFERENCES public.hobbies(id) ON DELETE CASCADE,
  intensity TEXT NOT NULL CHECK (intensity IN ('casual','regular','passionate')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, hobby_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_hobbies TO authenticated;
GRANT ALL ON public.profile_hobbies TO service_role;
ALTER TABLE public.profile_hobbies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_hobbies_select_own" ON public.profile_hobbies FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "profile_hobbies_insert_own" ON public.profile_hobbies FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "profile_hobbies_update_own" ON public.profile_hobbies FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "profile_hobbies_delete_own" ON public.profile_hobbies FOR DELETE TO authenticated USING (auth.uid() = profile_id);
CREATE INDEX profile_hobbies_profile_idx ON public.profile_hobbies (profile_id);
CREATE INDEX profile_hobbies_hobby_idx ON public.profile_hobbies (hobby_id);

CREATE TABLE public.personality_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_order INTEGER UNIQUE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.personality_questions TO authenticated;
GRANT ALL ON public.personality_questions TO service_role;
ALTER TABLE public.personality_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personality_questions_read" ON public.personality_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.personality_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.personality_questions(id) ON DELETE CASCADE,
  option_order INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  option_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_order)
);
GRANT SELECT ON public.personality_options TO authenticated;
GRANT ALL ON public.personality_options TO service_role;
ALTER TABLE public.personality_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personality_options_read" ON public.personality_options FOR SELECT TO authenticated USING (true);
CREATE INDEX personality_options_question_idx ON public.personality_options (question_id);

CREATE TABLE public.profile_personality_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.personality_questions(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.personality_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_personality_answers TO authenticated;
GRANT ALL ON public.profile_personality_answers TO service_role;
ALTER TABLE public.profile_personality_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ppa_select_own" ON public.profile_personality_answers FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "ppa_insert_own" ON public.profile_personality_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "ppa_update_own" ON public.profile_personality_answers FOR UPDATE TO authenticated USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "ppa_delete_own" ON public.profile_personality_answers FOR DELETE TO authenticated USING (auth.uid() = profile_id);
CREATE INDEX ppa_profile_idx ON public.profile_personality_answers (profile_id);
CREATE INDEX ppa_question_idx ON public.profile_personality_answers (question_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ppa_set_updated_at BEFORE UPDATE ON public.profile_personality_answers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.hobbies (name, category) VALUES
('Singing','Music'),('Guitar','Music'),('Piano','Music'),('Concerts','Music'),('Classical','Music'),('Hip-hop','Music'),('Indie','Music'),('Electronic','Music'),
('Football','Sports'),('Cricket','Sports'),('Basketball','Sports'),('Tennis','Sports'),('Badminton','Sports'),('Running','Sports'),('Gym','Sports'),('Cycling','Sports'),
('Programming','Technology'),('AI','Technology'),('Startups','Technology'),('Robotics','Technology'),('Gaming','Technology'),('Web Development','Technology'),('Cybersecurity','Technology'),
('Photography','Arts'),('Painting','Arts'),('Drawing','Arts'),('Design','Arts'),('Writing','Arts'),('Film Making','Arts'),
('Cooking','Food'),('Baking','Food'),('Cafés','Food'),('Street Food','Food'),('Fine Dining','Food'),
('Hiking','Outdoors'),('Trekking','Outdoors'),('Camping','Outdoors'),('Travel','Outdoors'),('Nature','Outdoors'),
('Fiction','Books'),('Non-fiction','Books'),('Psychology','Books'),('Philosophy','Books'),('Business','Books'),('Self-help','Books'),
('Cinema','Film'),('Documentaries','Film'),('Sci-fi','Film'),('Comedy','Film'),('Drama','Film'),('Thrillers','Film'),
('Meditation','Wellness'),('Yoga','Wellness'),('Fitness','Wellness'),('Mental Wellness','Wellness'),('Journaling','Wellness'),
('PC Gaming','Gaming'),('Console','Gaming'),('Mobile Gaming','Gaming'),('Esports','Gaming'),('Board Games','Gaming');

INSERT INTO public.personality_questions (question_order, question) VALUES
(1,'How do you usually recharge?'),
(2,'Your ideal Saturday?'),
(3,'When plans suddenly change, you...'),
(4,'How do you usually handle conflict?'),
(5,'What matters most in a partner?'),
(6,'Your ideal conversation is...'),
(7,'When making an important decision, you rely more on...'),
(8,'What makes you feel most connected to someone?');

INSERT INTO public.personality_options (question_id, option_order, option_text, option_value)
SELECT q.id, v.option_order, v.option_text, v.option_value
FROM (VALUES
(1,0,'Quiet time alone','quiet_time_alone'),(1,1,'Spending time with close friends','close_friends'),(1,2,'Going somewhere new','somewhere_new'),(1,3,'A little bit of everything','a_bit_of_everything'),
(2,0,'Staying in with a good book or movie','staying_in'),(2,1,'Meeting friends somewhere','meeting_friends'),(2,2,'Exploring somewhere new','exploring'),(2,3,'Working on something I''m passionate about','passion_project'),
(3,0,'Adapt easily','adapt_easily'),(3,1,'Need a little time','need_time'),(3,2,'Usually take charge','take_charge'),(3,3,'Prefer someone else to decide','someone_else_decides'),
(4,0,'Talk about it immediately','talk_immediately'),(4,1,'Take some time before talking','take_time'),(4,2,'Try to find common ground','common_ground'),(4,3,'Avoid confrontation when possible','avoid_confrontation'),
(5,0,'Emotional connection','emotional_connection'),(5,1,'Shared interests','shared_interests'),(5,2,'Similar values','similar_values'),(5,3,'Growth and ambition','growth_ambition'),
(6,0,'Deep and philosophical','deep_philosophical'),(6,1,'Funny and playful','funny_playful'),(6,2,'About shared passions','shared_passions'),(6,3,'A little bit of everything','a_bit_of_everything'),
(7,0,'Logic','logic'),(7,1,'Intuition','intuition'),(7,2,'Advice from people I trust','trusted_advice'),(7,3,'A combination of all three','combination'),
(8,0,'Being understood','being_understood'),(8,1,'Doing things together','doing_things_together'),(8,2,'Having meaningful conversations','meaningful_conversations'),(8,3,'Feeling completely comfortable around them','completely_comfortable')
) AS v(question_order, option_order, option_text, option_value)
JOIN public.personality_questions q ON q.question_order = v.question_order;
