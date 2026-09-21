/**
 * Central configuration for the Kindred compatibility heuristic.
 *
 * Everything tunable lives here: weights, intensity values, the personality
 * answer-pair matrices and the relationship-intent matrix. The engine itself
 * contains no magic numbers, so the product can be re-tuned without touching
 * the scoring code.
 *
 * NOTE: this is a product heuristic, not a scientifically validated model.
 */
import type { HobbyIntensityValue, RelationshipIntent } from "./types";

/** Weighted contribution of each dimension. Must sum to 1. */
export const SCORE_WEIGHTS = {
  hobbies: 0.4,
  personality: 0.3,
  intent: 0.15,
  location: 0.15,
} as const;

export const INTENSITY_WEIGHT: Record<HobbyIntensityValue, number> = {
  casual: 1,
  regular: 2,
  passionate: 3,
};

/**
 * Hobby normalisation.
 * - A single category saturates once its shared hobbies reach CATEGORY_SATURATION
 *   "passion points", so ten gaming tags cannot dominate the score.
 * - The overall hobby score is measured against TARGET_CATEGORIES saturated
 *   categories, which rewards breadth as well as depth.
 */
export const HOBBY_NORMALISATION = {
  categorySaturation: 2,
  targetCategories: 4,
} as const;

export const RELATIONSHIP_INTENTS: RelationshipIntent[] = [
  "long_term_relationship",
  "serious_dating",
  "open_to_seeing",
  "friendship_first",
];

export const RELATIONSHIP_INTENT_LABEL: Record<RelationshipIntent, string> = {
  long_term_relationship: "Long-term relationship",
  serious_dating: "Serious dating",
  open_to_seeing: "Open to seeing where it goes",
  friendship_first: "Friendship first",
};

/**
 * Symmetric intent compatibility, 0-1, indexed by RELATIONSHIP_INTENTS order.
 * Adjacent intents are close; opposite ends of the commitment spectrum conflict.
 */
export const INTENT_MATRIX: number[][] = [
  //        long  serious  open  friends
  /* long    */ [1.0, 0.85, 0.5, 0.25],
  /* serious */ [0.85, 1.0, 0.65, 0.35],
  /* open    */ [0.5, 0.65, 1.0, 0.7],
  /* friends */ [0.25, 0.35, 0.7, 1.0],
];

/** Used when one or both sides have not stated an intent yet. */
export const INTENT_UNKNOWN_SCORE = 0.5;

export const LOCATION_SCORES = {
  sameCity: 1,
  differentCityUnknownDistance: 0.4,
  /** Distance (km) at or below which two people are treated as fully local. */
  nearKm: 25,
  /** Distance (km) beyond which the location contribution bottoms out. */
  farKm: 250,
  farScore: 0.15,
} as const;

/**
 * Personality compatibility matrices, one per quiz question (order 1-8).
 * matrix[a-1][b-1] = 0-1 contribution for that pair of chosen options.
 * Every matrix is symmetric: compatibility does not depend on who is asked.
 * 1.0 = strongly compatible, ~0.6 neutral, <0.4 potentially conflicting.
 */
export const PERSONALITY_MATRICES: Record<number, number[][]> = {
  // 1. How do you usually recharge?
  // alone | close friends | somewhere new | a bit of everything
  1: [
    [0.9, 0.5, 0.4, 0.75],
    [0.5, 0.95, 0.7, 0.85],
    [0.4, 0.7, 0.95, 0.85],
    [0.75, 0.85, 0.85, 0.9],
  ],
  // 2. Your ideal Saturday?
  // in with book/movie | meeting friends | exploring | passion project
  2: [
    [0.95, 0.5, 0.45, 0.7],
    [0.5, 0.95, 0.8, 0.55],
    [0.45, 0.8, 0.95, 0.65],
    [0.7, 0.55, 0.65, 0.9],
  ],
  // 3. When plans suddenly change, you...
  // adapt easily | need time | take charge | let someone else decide
  3: [
    [0.9, 0.7, 0.8, 0.8],
    [0.7, 0.8, 0.5, 0.55],
    [0.8, 0.5, 0.6, 0.9],
    [0.8, 0.55, 0.9, 0.55],
  ],
  // 4. How do you usually handle conflict?
  // talk immediately | take time first | find common ground | avoid
  4: [
    [0.9, 0.5, 0.85, 0.3],
    [0.5, 0.85, 0.8, 0.6],
    [0.85, 0.8, 0.95, 0.6],
    [0.3, 0.6, 0.6, 0.5],
  ],
  // 5. What matters most in a partner?
  // emotional connection | shared interests | similar values | growth
  5: [
    [0.95, 0.6, 0.85, 0.6],
    [0.6, 0.9, 0.7, 0.65],
    [0.85, 0.7, 0.95, 0.75],
    [0.6, 0.65, 0.75, 0.9],
  ],
  // 6. Your ideal conversation is...
  // deep | funny and playful | shared passions | a bit of everything
  6: [
    [0.95, 0.45, 0.75, 0.8],
    [0.45, 0.95, 0.7, 0.85],
    [0.75, 0.7, 0.95, 0.85],
    [0.8, 0.85, 0.85, 0.9],
  ],
  // 7. Making an important decision, you rely on...
  // logic | intuition | trusted advice | a combination
  7: [
    [0.9, 0.5, 0.7, 0.8],
    [0.5, 0.9, 0.7, 0.8],
    [0.7, 0.7, 0.85, 0.85],
    [0.8, 0.8, 0.85, 0.9],
  ],
  // 8. What makes you feel most connected to someone?
  // being understood | doing things together | meaningful talks | comfort
  8: [
    [0.95, 0.6, 0.9, 0.85],
    [0.6, 0.9, 0.6, 0.75],
    [0.9, 0.6, 0.95, 0.8],
    [0.85, 0.75, 0.8, 0.95],
  ],
};

/** Human-readable hooks used by the deterministic explanation generator. */
export const PERSONALITY_REASON_LABEL: Record<number, string> = {
  1: "how you recharge",
  2: "how you like to spend a free day",
  3: "how you handle plans changing",
  4: "how you work through disagreements",
  5: "what you look for in a partner",
  6: "the conversations you enjoy",
  7: "how you make decisions",
  8: "what makes you feel connected",
};

/** Used when a personality answer is missing on either side. */
export const PERSONALITY_UNKNOWN_SCORE = 0.6;

/** Thresholds the explanation generator uses to decide what is worth saying. */
export const EXPLANATION_THRESHOLDS = {
  strongPersonality: 0.85,
  weakPersonality: 0.45,
  strongIntent: 0.85,
  maxReasons: 8,
} as const;

export const DEFAULT_PREFERENCES = {
  minAge: 18,
  maxAge: 99,
  maxDistanceKm: null as number | null,
  preferredGenders: [] as string[],
  relationshipIntent: null as RelationshipIntent | null,
};

/* ------------------------------------------------------------------ */
/* Collected matching preferences (onboarding "What are you looking for?") */
/* ------------------------------------------------------------------ */

/** Supported age bounds for preference collection (matches the DB CHECK). */
export const AGE_PREFERENCE_BOUNDS = { min: 18, max: 120 } as const;

/**
 * Sensible starting range derived from the member's own age.
 * Always editable; always clamped to the supported bounds.
 */
export function suggestedAgeRange(age: number | null): { minAge: number; maxAge: number } {
  if (!age || !Number.isFinite(age)) {
    return { minAge: DEFAULT_PREFERENCES.minAge, maxAge: DEFAULT_PREFERENCES.maxAge };
  }
  const minAge = Math.max(AGE_PREFERENCE_BOUNDS.min, age - 1);
  const maxAge = Math.min(AGE_PREFERENCE_BOUNDS.max, Math.max(minAge + 1, age + 5));
  return { minAge, maxAge };
}

export const GENDER_PREFERENCE_OPTIONS = ["Women", "Men", "Everyone"] as const;

/**
 * Distance preference. `0` means "same city only" (city-level comparison, we
 * never hold precise coordinates); `null` means "anywhere" / unlimited.
 */
export const SAME_CITY_ONLY_KM = 0;

export const DISTANCE_PREFERENCE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Same city", value: SAME_CITY_ONLY_KM },
  { label: "Within 10 km", value: 10 },
  { label: "Within 25 km", value: 25 },
  { label: "Within 50 km", value: 50 },
  { label: "Anywhere", value: null },
];
