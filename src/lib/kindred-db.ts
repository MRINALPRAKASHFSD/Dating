import { supabase } from "@/integrations/supabase/client";
import type { HobbyIntensity } from "@/context/onboarding-context";
import type { MatchPreferences, RelationshipIntent } from "@/lib/matching/types";
import { defaultPreferences } from "@/lib/matching/engine";

/** Reads the signed-in member's matching preferences (own row only, via RLS). */
export async function loadPreferences(userId: string): Promise<MatchPreferences> {
  const { data, error } = await supabase
    .from("profile_preferences")
    .select("min_age, max_age, max_distance_km, preferred_genders, relationship_intent")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultPreferences();
  return {
    minAge: data.min_age,
    maxAge: data.max_age,
    maxDistanceKm: data.max_distance_km,
    preferredGenders: data.preferred_genders ?? [],
    relationshipIntent: (data.relationship_intent as RelationshipIntent | null) ?? null,
  };
}

/** Creates or updates the signed-in member's matching preferences. */
export async function savePreferences(userId: string, preferences: MatchPreferences) {
  const { error } = await supabase.from("profile_preferences").upsert(
    {
      profile_id: userId,
      min_age: preferences.minAge,
      max_age: preferences.maxAge,
      max_distance_km: preferences.maxDistanceKm,
      preferred_genders: preferences.preferredGenders,
      relationship_intent: preferences.relationshipIntent,
    },
    { onConflict: "profile_id" },
  );
  if (error) throw error;
}

const toDbIntensity = (level: HobbyIntensity) => level.toLowerCase();
const toLabel = (value: string): HobbyIntensity =>
  (value.charAt(0).toUpperCase() + value.slice(1)) as HobbyIntensity;

export type LoadedOnboarding = {
  basicDetails: { firstName: string; age: string; location: string; gender: string; lookingFor: string };
  preferences: MatchPreferences;
  hobbies: string[];
  hobbyIntensity: Record<string, HobbyIntensity>;
  personalityAnswers: Record<number, number>;
  bio: string;
  onboardingCompleted: boolean;
};

export async function ensureProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return created;
}

export async function loadOnboarding(userId: string): Promise<LoadedOnboarding> {
  const profile = await ensureProfile(userId);

  const [preferences, { data: hobbyRows, error: hobbyError }, { data: answerRows, error: answerError }] = await Promise.all([
    loadPreferences(userId),
    supabase.from("profile_hobbies").select("intensity, hobbies(name)").eq("profile_id", userId),
    supabase
      .from("profile_personality_answers")
      .select("personality_questions(question_order), personality_options(option_order)")
      .eq("profile_id", userId),
  ]);
  if (hobbyError) throw hobbyError;
  if (answerError) throw answerError;

  const hobbies: string[] = [];
  const hobbyIntensity: Record<string, HobbyIntensity> = {};
  for (const row of hobbyRows ?? []) {
    const name = row.hobbies?.name;
    if (!name) continue;
    hobbies.push(name);
    hobbyIntensity[name] = toLabel(row.intensity);
  }

  const personalityAnswers: Record<number, number> = {};
  for (const row of answerRows ?? []) {
    const order = row.personality_questions?.question_order;
    const option = row.personality_options?.option_order;
    if (order == null || option == null) continue;
    personalityAnswers[order - 1] = option;
  }

  return {
    basicDetails: {
      firstName: profile.first_name ?? "",
      age: profile.age == null ? "" : String(profile.age),
      location: profile.city ?? "",
      gender: profile.gender ?? "",
      lookingFor: profile.looking_for?.[0] ?? "",
    },
    preferences,
    hobbies,
    hobbyIntensity,
    personalityAnswers,
    bio: profile.bio ?? "",
    onboardingCompleted: profile.onboarding_completed,
  };
}

export async function saveBasicDetails(
  userId: string,
  details: { firstName: string; age: string; location: string; gender: string; lookingFor: string },
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: details.firstName.trim(),
      age: Number(details.age),
      city: details.location.trim(),
      gender: details.gender,
      looking_for: details.lookingFor ? [details.lookingFor] : [],
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function saveHobbies(
  userId: string,
  hobbies: string[],
  intensity: Record<string, HobbyIntensity>,
) {
  const { data: taxonomy, error: taxonomyError } = await supabase.from("hobbies").select("id, name");
  if (taxonomyError) throw taxonomyError;
  const idByName = new Map((taxonomy ?? []).map((row) => [row.name, row.id]));
  const keptIds = hobbies.map((name) => idByName.get(name)).filter((id): id is string => Boolean(id));

  const remove = supabase.from("profile_hobbies").delete().eq("profile_id", userId);
  const { error: deleteError } = keptIds.length
    ? await remove.not("hobby_id", "in", `(${keptIds.join(",")})`)
    : await remove;
  if (deleteError) throw deleteError;

  if (!keptIds.length) return;
  const rows = hobbies
    .map((name) => {
      const hobbyId = idByName.get(name);
      if (!hobbyId) return null;
      return { profile_id: userId, hobby_id: hobbyId, intensity: toDbIntensity(intensity[name] ?? "Regular") };
    })
    .filter((row): row is { profile_id: string; hobby_id: string; intensity: string } => row !== null);
  const { error } = await supabase.from("profile_hobbies").upsert(rows, { onConflict: "profile_id,hobby_id" });
  if (error) throw error;
}

export async function savePersonalityAnswers(userId: string, answers: Record<number, number>) {
  const { data: questions, error: questionError } = await supabase
    .from("personality_questions")
    .select("id, question_order, personality_options(id, option_order)");
  if (questionError) throw questionError;

  const rows = [];
  for (const question of questions ?? []) {
    const chosen = answers[question.question_order - 1];
    if (chosen == null) continue;
    const option = question.personality_options.find((item) => item.option_order === chosen);
    if (!option) continue;
    rows.push({ profile_id: userId, question_id: question.id, option_id: option.id });
  }
  if (!rows.length) return;
  const { error } = await supabase
    .from("profile_personality_answers")
    .upsert(rows, { onConflict: "profile_id,question_id" });
  if (error) throw error;
}

export async function saveBio(userId: string, bio: string) {
  const { error } = await supabase.from("profiles").update({ bio }).eq("id", userId);
  if (error) throw error;
}

export async function completeOnboarding(userId: string, bio: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ bio, onboarding_completed: true })
    .eq("id", userId);
  if (error) throw error;
}

/** Where an authenticated member should continue their onboarding. */
export function resumePath(state: LoadedOnboarding): string {
  if (state.onboardingCompleted) return "/home";
  const { firstName, age, location, gender, lookingFor } = state.basicDetails;
  if (!firstName || !age || !location || !gender || !lookingFor) return "/details";
  if (!state.preferences.relationshipIntent || state.preferences.preferredGenders.length === 0) {
    return "/preferences";
  }
  if (state.hobbies.length < 5) return "/hobbies";
  if (Object.keys(state.personalityAnswers).length < 8) return "/quiz";
  return "/profile";
}
