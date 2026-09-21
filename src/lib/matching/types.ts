/** Shared types for the Kindred compatibility engine. Pure data, no I/O. */

export type HobbyIntensityValue = "casual" | "regular" | "passionate";

export type RelationshipIntent =
  | "long_term_relationship"
  | "serious_dating"
  | "open_to_seeing"
  | "friendship_first";

export type HobbySelection = {
  hobbyId: string;
  name: string;
  category: string;
  intensity: HobbyIntensityValue;
};

/** One answer: question order (1-based) -> chosen option order (1-based). */
export type PersonalityAnswers = Record<number, number>;

export type MatchPreferences = {
  minAge: number;
  maxAge: number;
  maxDistanceKm: number | null;
  preferredGenders: string[];
  relationshipIntent: RelationshipIntent | null;
};

export type MatchCandidate = {
  profileId: string;
  firstName: string;
  age: number | null;
  city: string | null;
  gender: string | null;
  bio: string | null;
  hobbies: HobbySelection[];
  personalityAnswers: PersonalityAnswers;
  preferences: MatchPreferences;
};

export type CompatibilityBreakdown = {
  hobbies: number;
  personality: number;
  intent: number;
  location: number;
};

export type CompatibilityResult = {
  /** 0-100, rounded. */
  score: number;
  /** Each sub-score is 0-1 before weighting. */
  breakdown: CompatibilityBreakdown;
  reasons: string[];
};

export type EligibilityResult = {
  eligible: boolean;
  /** Stable machine-readable filter reason, only set when not eligible. */
  reason?:
    | "candidate_gender_not_preferred"
    | "viewer_gender_not_preferred"
    | "candidate_age_out_of_range"
    | "viewer_age_out_of_range"
    | "distance_exceeds_max"
    | "incomplete_profile";
};

export type PublicHobby = {
  name: string;
  category: string;
  intensity: HobbyIntensityValue;
  /** True when the viewer selected this interest too. */
  shared: boolean;
};

/** Exactly what the discovery UI is allowed to see. */
export type PublicMatch = {
  profileId: string;
  firstName: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  /** Photos are optional on Kindred; null means "no photo", never a placeholder. */
  photoUrl: string | null;
  hobbies: PublicHobby[];
  personalityTraits: string[];
  compatibilityScore: number;
  compatibilityBreakdown: CompatibilityBreakdown;
  compatibilityReasons: string[];
};

/** Outgoing decision a member has recorded about a candidate. */
export type InterestStatus = "interested" | "passed" | "withdrawn";
