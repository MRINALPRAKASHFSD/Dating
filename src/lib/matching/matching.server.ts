/**
 * Server-only data access for the matching engine.
 *
 * Reads are performed with the service-role client AFTER the caller's identity
 * has been verified by the auth middleware; the caller's id is taken from the
 * verified JWT, never from client input. Only the projected PublicMatch shape
 * leaves the server, so emails, auth data and preferences of other members are
 * never exposed.
 *
 * Query plan is fixed at 5 queries regardless of candidate count (no N+1).
 */
import { defaultPreferences, rankCandidates } from "./engine";
import type {
  HobbyIntensityValue,
  MatchCandidate,
  MatchPreferences,
  PublicMatch,
  RelationshipIntent,
} from "./types";

const CANDIDATE_LIMIT = 500;

type PreferenceRow = {
  profile_id: string;
  min_age: number;
  max_age: number;
  max_distance_km: number | null;
  preferred_genders: string[];
  relationship_intent: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  age: number | null;
  city: string | null;
  gender: string | null;
  bio: string | null;
  looking_for: string[] | null;
};

function toPreferences(row: PreferenceRow | undefined, profile: ProfileRow): MatchPreferences {
  if (!row) {
    // Fall back to what onboarding already captured ("looking for").
    return { ...defaultPreferences(), preferredGenders: profile.looking_for ?? [] };
  }
  return {
    minAge: row.min_age,
    maxAge: row.max_age,
    maxDistanceKm: row.max_distance_km,
    preferredGenders:
      row.preferred_genders.length > 0 ? row.preferred_genders : (profile.looking_for ?? []),
    relationshipIntent: (row.relationship_intent as RelationshipIntent | null) ?? null,
  };
}

/**
 * Loads fully-formed match candidates in a fixed number of queries.
 * When `ids` is given only those profiles are loaded, otherwise every member
 * who has completed onboarding (capped) is returned.
 */
export async function loadCandidates(ids?: string[]): Promise<MatchCandidate[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (ids && ids.length === 0) return [];

  let profilesQuery = supabaseAdmin
    .from("profiles")
    .select("id, first_name, age, city, gender, bio, looking_for");
  profilesQuery = ids
    ? profilesQuery.in("id", ids)
    : profilesQuery.eq("onboarding_completed", true).limit(CANDIDATE_LIMIT);

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) throw profilesError;

  const rows = (profiles ?? []) as ProfileRow[];
  if (rows.length === 0) return [];
  const profileIds = rows.map((row) => row.id);

  const [preferencesResult, hobbiesResult, answersResult] = await Promise.all([
    supabaseAdmin
      .from("profile_preferences")
      .select("profile_id, min_age, max_age, max_distance_km, preferred_genders, relationship_intent")
      .in("profile_id", profileIds),
    supabaseAdmin
      .from("profile_hobbies")
      .select("profile_id, hobby_id, intensity, hobbies(name, category)")
      .in("profile_id", profileIds),
    supabaseAdmin
      .from("profile_personality_answers")
      .select("profile_id, personality_questions(question_order), personality_options(option_order)")
      .in("profile_id", profileIds),
  ]);
  if (preferencesResult.error) throw preferencesResult.error;
  if (hobbiesResult.error) throw hobbiesResult.error;
  if (answersResult.error) throw answersResult.error;

  const preferencesById = new Map<string, PreferenceRow>(
    ((preferencesResult.data ?? []) as PreferenceRow[]).map((row) => [row.profile_id, row]),
  );

  const hobbiesById = new Map<string, MatchCandidate["hobbies"]>();
  for (const row of hobbiesResult.data ?? []) {
    const hobby = row.hobbies;
    if (!hobby) continue;
    const list = hobbiesById.get(row.profile_id) ?? [];
    list.push({
      hobbyId: row.hobby_id,
      name: hobby.name,
      category: hobby.category,
      intensity: row.intensity as HobbyIntensityValue,
    });
    hobbiesById.set(row.profile_id, list);
  }

  const answersById = new Map<string, Record<number, number>>();
  for (const row of answersResult.data ?? []) {
    const order = row.personality_questions?.question_order;
    const option = row.personality_options?.option_order;
    if (order == null || option == null) continue;
    const answers = answersById.get(row.profile_id) ?? {};
    answers[order] = option;
    answersById.set(row.profile_id, answers);
  }

  return rows.map((row) => ({
    profileId: row.id,
    firstName: row.first_name ?? "",
    age: row.age,
    city: row.city,
    gender: row.gender,
    bio: row.bio,
    hobbies: hobbiesById.get(row.id) ?? [],
    personalityAnswers: answersById.get(row.id) ?? {},
    preferences: toPreferences(preferencesById.get(row.id), row),
  }));
}

export async function getCompatibleMatchesFor(
  userId: string,
  limit = 10,
  offset = 0,
): Promise<PublicMatch[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getBlockedUserIds } = await import("@/lib/safety/safety.server");

  const [candidates, decisionsResult, matchesResult, blockedUserIds] = await Promise.all([
    loadCandidates(),
    supabaseAdmin
      .from("profile_interests")
      .select("to_profile_id, status")
      .eq("from_profile_id", userId)
      .in("status", ["interested", "passed"]),
    supabaseAdmin
      .from("matches")
      .select("profile_a_id, profile_b_id, status")
      .or(`profile_a_id.eq.${userId},profile_b_id.eq.${userId}`)
      .eq("status", "active"),
    getBlockedUserIds(userId),
  ]);
  if (decisionsResult.error) throw decisionsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const viewer = candidates.find((candidate) => candidate.profileId === userId);
  if (!viewer) return [];

  // Anyone the member has already decided about is not a fresh candidate.
  // "withdrawn" is deliberately excluded, so withdrawing brings them back.
  const decided = new Set((decisionsResult.data ?? []).map((row) => row.to_profile_id));
  // Active connections never reappear in discovery.
  for (const row of matchesResult.data ?? []) {
    decided.add(row.profile_a_id === userId ? row.profile_b_id : row.profile_a_id);
  }
  // Blocked users in either direction never appear in discovery.
  for (const blockedId of blockedUserIds) {
    decided.add(blockedId);
  }

  const pool = candidates.filter((candidate) => !decided.has(candidate.profileId));
  return rankCandidates(viewer, pool).slice(offset, offset + limit);
}

