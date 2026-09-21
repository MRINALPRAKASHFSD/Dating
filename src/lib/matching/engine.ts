/**
 * Kindred compatibility engine — pure, deterministic, side-effect free.
 *
 * No database access, no React, no randomness. Every number it returns is
 * derived from stored user data plus the rules in ./config.
 */
import {
  DEFAULT_PREFERENCES,
  EXPLANATION_THRESHOLDS,
  HOBBY_NORMALISATION,
  INTENSITY_WEIGHT,
  INTENT_MATRIX,
  INTENT_UNKNOWN_SCORE,
  LOCATION_SCORES,
  PERSONALITY_MATRICES,
  PERSONALITY_REASON_LABEL,
  PERSONALITY_UNKNOWN_SCORE,
  RELATIONSHIP_INTENTS,
  SAME_CITY_ONLY_KM,
  RELATIONSHIP_INTENT_LABEL,
  SCORE_WEIGHTS,
} from "./config";
import { personalityTraits } from "./personality";
import type {
  CompatibilityBreakdown,
  CompatibilityResult,
  EligibilityResult,
  HobbySelection,
  MatchCandidate,
  MatchPreferences,
  PublicMatch,
} from "./types";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/* ------------------------------------------------------------------ */
/* Gender / preference helpers                                         */
/* ------------------------------------------------------------------ */

/** Normalises the onboarding labels ("Woman", "Women", "Everyone") to tokens. */
export function normaliseGenderToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const token = value.trim().toLowerCase();
  if (!token) return null;
  if (token === "women" || token === "woman") return "woman";
  if (token === "men" || token === "man") return "man";
  if (token === "non-binary" || token === "nonbinary" || token === "non binary") return "non-binary";
  if (token === "everyone" || token === "anyone") return "everyone";
  if (token.startsWith("prefer not")) return "unspecified";
  return token;
}

/** True when `gender` satisfies `preferred`. Unknowns never exclude anyone. */
export function genderIsPreferred(gender: string | null, preferred: string[]): boolean {
  const wanted = preferred.map(normaliseGenderToken).filter(Boolean) as string[];
  if (wanted.length === 0 || wanted.includes("everyone")) return true;
  const actual = normaliseGenderToken(gender);
  if (!actual || actual === "unspecified") return true;
  return wanted.includes(actual);
}

/* ------------------------------------------------------------------ */
/* Hard eligibility filters                                            */
/* ------------------------------------------------------------------ */

/**
 * Mutual hard filters. A failing candidate is removed entirely — it is never
 * shown with a low score.
 */
export function checkEligibility(
  viewer: MatchCandidate,
  candidate: MatchCandidate,
  distanceKm: number | null = null,
): EligibilityResult {
  if (!candidate.firstName) return { eligible: false, reason: "incomplete_profile" };

  if (!genderIsPreferred(candidate.gender, viewer.preferences.preferredGenders)) {
    return { eligible: false, reason: "candidate_gender_not_preferred" };
  }
  if (!genderIsPreferred(viewer.gender, candidate.preferences.preferredGenders)) {
    return { eligible: false, reason: "viewer_gender_not_preferred" };
  }

  if (candidate.age != null) {
    if (candidate.age < viewer.preferences.minAge || candidate.age > viewer.preferences.maxAge) {
      return { eligible: false, reason: "candidate_age_out_of_range" };
    }
  }
  if (viewer.age != null) {
    if (viewer.age < candidate.preferences.minAge || viewer.age > candidate.preferences.maxAge) {
      return { eligible: false, reason: "viewer_age_out_of_range" };
    }
  }

  // "Same city" (0 km) is a city-level rule: we never hold precise coordinates.
  const citiesKnown = Boolean(viewer.city && candidate.city);
  const wantsSameCity =
    viewer.preferences.maxDistanceKm === SAME_CITY_ONLY_KM ||
    candidate.preferences.maxDistanceKm === SAME_CITY_ONLY_KM;
  if (wantsSameCity && citiesKnown && !sameCity(viewer.city, candidate.city)) {
    return { eligible: false, reason: "distance_exceeds_max" };
  }

  if (distanceKm != null) {
    const limits = [viewer.preferences.maxDistanceKm, candidate.preferences.maxDistanceKm].filter(
      (value): value is number => value != null && value > SAME_CITY_ONLY_KM,
    );
    if (limits.some((limit) => distanceKm > limit)) {
      return { eligible: false, reason: "distance_exceeds_max" };
    }
  }


  return { eligible: true };
}

/* ------------------------------------------------------------------ */
/* Hobby compatibility                                                 */
/* ------------------------------------------------------------------ */

export type SharedHobby = {
  name: string;
  category: string;
  viewerIntensity: HobbySelection["intensity"];
  candidateIntensity: HobbySelection["intensity"];
  /** 0-1 pair contribution: product of the two intensity weights, normalised. */
  contribution: number;
};

export function findSharedHobbies(a: HobbySelection[], b: HobbySelection[]): SharedHobby[] {
  const byId = new Map(b.map((hobby) => [hobby.hobbyId, hobby]));
  const shared: SharedHobby[] = [];
  for (const hobby of a) {
    const other = byId.get(hobby.hobbyId);
    if (!other) continue;
    const contribution =
      (INTENSITY_WEIGHT[hobby.intensity] * INTENSITY_WEIGHT[other.intensity]) /
      (INTENSITY_WEIGHT.passionate * INTENSITY_WEIGHT.passionate);
    shared.push({
      name: hobby.name,
      category: hobby.category,
      viewerIntensity: hobby.intensity,
      candidateIntensity: other.intensity,
      contribution,
    });
  }
  return shared.sort(
    (x, y) => y.contribution - x.contribution || x.name.localeCompare(y.name),
  );
}

/**
 * 0-1 hobby score. Each category saturates, so depth inside one category cannot
 * dominate; reaching the target number of saturated categories rewards breadth.
 */
export function scoreHobbies(shared: SharedHobby[]): number {
  if (shared.length === 0) return 0;
  const byCategory = new Map<string, number>();
  for (const hobby of shared) {
    byCategory.set(hobby.category, (byCategory.get(hobby.category) ?? 0) + hobby.contribution);
  }
  let total = 0;
  for (const sum of byCategory.values()) {
    total += Math.min(1, sum / HOBBY_NORMALISATION.categorySaturation);
  }
  return clamp01(total / HOBBY_NORMALISATION.targetCategories);
}

/* ------------------------------------------------------------------ */
/* Personality compatibility                                           */
/* ------------------------------------------------------------------ */

export type PersonalityPair = {
  questionOrder: number;
  score: number;
  answered: boolean;
};

export function scorePersonalityPairs(
  a: Record<number, number>,
  b: Record<number, number>,
): PersonalityPair[] {
  return Object.keys(PERSONALITY_MATRICES)
    .map(Number)
    .sort((x, y) => x - y)
    .map((questionOrder) => {
      const answerA = a[questionOrder];
      const answerB = b[questionOrder];
      const matrix = PERSONALITY_MATRICES[questionOrder];
      const cell =
        answerA && answerB ? matrix?.[answerA - 1]?.[answerB - 1] : undefined;
      return {
        questionOrder,
        score: cell ?? PERSONALITY_UNKNOWN_SCORE,
        answered: cell != null,
      };
    });
}

export function scorePersonality(pairs: PersonalityPair[]): number {
  if (pairs.length === 0) return PERSONALITY_UNKNOWN_SCORE;
  const total = pairs.reduce((sum, pair) => sum + pair.score, 0);
  return clamp01(total / pairs.length);
}

/* ------------------------------------------------------------------ */
/* Intent and location                                                 */
/* ------------------------------------------------------------------ */

export function scoreIntent(
  a: MatchPreferences["relationshipIntent"],
  b: MatchPreferences["relationshipIntent"],
): number {
  if (!a || !b) return INTENT_UNKNOWN_SCORE;
  const indexA = RELATIONSHIP_INTENTS.indexOf(a);
  const indexB = RELATIONSHIP_INTENTS.indexOf(b);
  if (indexA < 0 || indexB < 0) return INTENT_UNKNOWN_SCORE;
  return INTENT_MATRIX[indexA]?.[indexB] ?? INTENT_UNKNOWN_SCORE;
}

const sameCity = (a: string | null, b: string | null) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

/** City-based by default; an approximate distance refines it when available. */
export function scoreLocation(
  cityA: string | null,
  cityB: string | null,
  distanceKm: number | null = null,
): number {
  if (distanceKm != null) {
    if (distanceKm <= LOCATION_SCORES.nearKm) return 1;
    if (distanceKm >= LOCATION_SCORES.farKm) return LOCATION_SCORES.farScore;
    const span = LOCATION_SCORES.farKm - LOCATION_SCORES.nearKm;
    const progress = (distanceKm - LOCATION_SCORES.nearKm) / span;
    return clamp01(1 - progress * (1 - LOCATION_SCORES.farScore));
  }
  if (sameCity(cityA, cityB)) return LOCATION_SCORES.sameCity;
  return LOCATION_SCORES.differentCityUnknownDistance;
}

/* ------------------------------------------------------------------ */
/* Explanations                                                        */
/* ------------------------------------------------------------------ */

/** "Long-term relationship" -> "a long-term relationship"; "Friendship first" stays bare. */
function intentPhrase(label: string): string {
  const lower = label.toLowerCase();
  return /^(long-term|serious)/.test(lower) ? `a ${lower}` : lower;
}

function buildReasons(args: {
  viewer: MatchCandidate;
  candidate: MatchCandidate;
  shared: SharedHobby[];
  personality: PersonalityPair[];
  intentScore: number;
  locationScore: number;
  distanceKm: number | null;
}): string[] {
  const { viewer, candidate, shared, personality, intentScore, locationScore } = args;
  // `reasons` holds the highest-signal explanations; `secondary` is appended
  // afterwards and only survives if there is room under the cap.
  const reasons: string[] = [];
  const secondary: string[] = [];

  const bothPassionate = shared.filter(
    (hobby) => hobby.viewerIntensity === "passionate" && hobby.candidateIntensity === "passionate",
  );
  for (const hobby of bothPassionate.slice(0, 2)) {
    reasons.push(`You both marked ${hobby.name.toLowerCase()} as a passionate interest.`);
  }

  const remaining = shared.filter((hobby) => !bothPassionate.includes(hobby));
  if (bothPassionate.length === 0 && remaining.length > 0) {
    const top = remaining[0]!;
    reasons.push(`You both selected ${top.name.toLowerCase()}.`);
  }

  if (shared.length >= 2) {
    reasons.push(`You share ${shared.length} interests.`);
  }

  const categories = new Set(shared.map((hobby) => hobby.category));
  if (categories.size >= 3) {
    secondary.push(`Your interests overlap across ${categories.size} different areas.`);
  }

  const strongest = personality
    .filter((pair) => pair.answered && pair.score >= EXPLANATION_THRESHOLDS.strongPersonality)
    .sort((a, b) => b.score - a.score || a.questionOrder - b.questionOrder);
  strongest.slice(0, 2).forEach((pair, index) => {
    const sentence = `You see ${PERSONALITY_REASON_LABEL[pair.questionOrder]} in a similar way.`;
    (index === 0 ? reasons : secondary).push(sentence);
  });

  const conflicting = personality.filter(
    (pair) => pair.answered && pair.score <= EXPLANATION_THRESHOLDS.weakPersonality,
  );
  if (conflicting.length > 0 && strongest.length > 0) {
    const pair = conflicting[0]!;
    secondary.push(`You differ on ${PERSONALITY_REASON_LABEL[pair.questionOrder]}.`);
  }

  const viewerIntent = viewer.preferences.relationshipIntent;
  const candidateIntent = candidate.preferences.relationshipIntent;
  if (viewerIntent && candidateIntent) {
    if (intentScore >= EXPLANATION_THRESHOLDS.strongIntent) {
      reasons.push(
        viewerIntent === candidateIntent
          ? `You're both looking for ${intentPhrase(RELATIONSHIP_INTENT_LABEL[viewerIntent])}.`
          : "Your relationship goals align.",
      );
    } else if (intentScore < 0.5) {
      reasons.push("You're looking for different kinds of relationship.");
    }
  }

  if (locationScore >= 1 && sameCity(viewer.city, candidate.city) && candidate.city) {
    reasons.push(`You're both in ${candidate.city}.`);
  }

  if (
    viewer.age != null &&
    candidate.age != null &&
    candidate.age >= viewer.preferences.minAge &&
    candidate.age <= viewer.preferences.maxAge &&
    viewer.age >= candidate.preferences.minAge &&
    viewer.age <= candidate.preferences.maxAge
  ) {
    reasons.push("You're within each other's preferred age range.");
  }

  return [...reasons, ...secondary].slice(0, EXPLANATION_THRESHOLDS.maxReasons);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function calculateCompatibility(
  viewer: MatchCandidate,
  candidate: MatchCandidate,
  distanceKm: number | null = null,
): CompatibilityResult {
  const shared = findSharedHobbies(viewer.hobbies, candidate.hobbies);
  const personalityPairs = scorePersonalityPairs(
    viewer.personalityAnswers,
    candidate.personalityAnswers,
  );

  const breakdown: CompatibilityBreakdown = {
    hobbies: scoreHobbies(shared),
    personality: scorePersonality(personalityPairs),
    intent: scoreIntent(
      viewer.preferences.relationshipIntent,
      candidate.preferences.relationshipIntent,
    ),
    location: scoreLocation(viewer.city, candidate.city, distanceKm),
  };

  const weighted =
    breakdown.hobbies * SCORE_WEIGHTS.hobbies +
    breakdown.personality * SCORE_WEIGHTS.personality +
    breakdown.intent * SCORE_WEIGHTS.intent +
    breakdown.location * SCORE_WEIGHTS.location;

  return {
    score: Math.round(clamp01(weighted) * 100),
    breakdown,
    reasons: buildReasons({
      viewer,
      candidate,
      shared,
      personality: personalityPairs,
      intentScore: breakdown.intent,
      locationScore: breakdown.location,
      distanceKm,
    }),
  };
}

/**
 * Projects a candidate to the shape the discovery UI is allowed to receive.
 * Interests that the viewer also selected are flagged and listed first, so the
 * UI can lead with what actually contributed to the score.
 */
export function toPublicMatch(
  candidate: MatchCandidate,
  result: CompatibilityResult,
  viewerHobbies: HobbySelection[] = [],
): PublicMatch {
  const sharedIds = new Set(viewerHobbies.map((hobby) => hobby.hobbyId));
  const hobbies = candidate.hobbies
    .map((hobby) => ({
      name: hobby.name,
      category: hobby.category,
      intensity: hobby.intensity,
      shared: sharedIds.has(hobby.hobbyId),
    }))
    .sort(
      (a, b) =>
        Number(b.shared) - Number(a.shared) ||
        INTENSITY_WEIGHT[b.intensity] - INTENSITY_WEIGHT[a.intensity] ||
        a.name.localeCompare(b.name),
    );
  return {
    profileId: candidate.profileId,
    firstName: candidate.firstName,
    age: candidate.age,
    city: candidate.city,
    bio: candidate.bio,
    photoUrl: null,
    hobbies,
    personalityTraits: personalityTraits(candidate.personalityAnswers),
    compatibilityScore: result.score,
    compatibilityBreakdown: result.breakdown,
    compatibilityReasons: result.reasons,
  };
}

/** Ranks a candidate pool for one viewer. Filtering happens before scoring. */
export function rankCandidates(
  viewer: MatchCandidate,
  candidates: MatchCandidate[],
  distanceFor: (candidate: MatchCandidate) => number | null = () => null,
): PublicMatch[] {
  const matches: PublicMatch[] = [];
  for (const candidate of candidates) {
    if (candidate.profileId === viewer.profileId) continue;
    const distanceKm = distanceFor(candidate);
    if (!checkEligibility(viewer, candidate, distanceKm).eligible) continue;
    const result = calculateCompatibility(viewer, candidate, distanceKm);
    matches.push(toPublicMatch(candidate, result, viewer.hobbies));
  }
  return matches.sort(
    (a, b) =>
      b.compatibilityScore - a.compatibilityScore ||
      a.firstName.localeCompare(b.firstName) ||
      a.profileId.localeCompare(b.profileId),
  );
}

export const defaultPreferences = (): MatchPreferences => ({ ...DEFAULT_PREFERENCES });
