import { describe, expect, it } from "vitest";

import {
  calculateCompatibility,
  checkEligibility,
  findSharedHobbies,
  genderIsPreferred,
  defaultPreferences,
  rankCandidates,
  scoreHobbies,
  scoreIntent,
  scoreLocation,
} from "./engine";
import { hobby, makeCandidate, uniformAnswers } from "./fixtures";
import { SAME_CITY_ONLY_KM, SCORE_WEIGHTS, suggestedAgeRange } from "./config";
import { personalityTraits } from "./personality";

const musicHobbies = (intensity: "casual" | "regular" | "passionate") => [
  hobby("h1", "Guitar", "Music", intensity),
  hobby("h2", "Concerts", "Music", intensity),
  hobby("h3", "Photography", "Arts", intensity),
  hobby("h4", "Travel", "Outdoors", intensity),
  hobby("h5", "Cooking", "Food", intensity),
];

describe("configuration", () => {
  it("weights sum to 1", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("hobby compatibility", () => {
  it("case 1: many passionate shared interests score high", () => {
    const shared = findSharedHobbies(musicHobbies("passionate"), musicHobbies("passionate"));
    expect(shared).toHaveLength(5);
    expect(scoreHobbies(shared)).toBeGreaterThan(0.6);
  });

  it("case 2: passionate + casual scores lower than passionate + passionate", () => {
    const both = scoreHobbies(findSharedHobbies(musicHobbies("passionate"), musicHobbies("passionate")));
    const mixed = scoreHobbies(findSharedHobbies(musicHobbies("passionate"), musicHobbies("casual")));
    const regular = scoreHobbies(findSharedHobbies(musicHobbies("regular"), musicHobbies("regular")));
    expect(mixed).toBeLessThan(both);
    expect(mixed).toBeLessThan(regular);
    expect(mixed).toBeGreaterThan(0);
  });

  it("case 3: no shared hobbies scores zero but personality still contributes", () => {
    const a = makeCandidate({
      profileId: "a",
      firstName: "Ada",
      hobbies: [hobby("h1", "Guitar", "Music", "passionate")],
      personalityAnswers: uniformAnswers(1),
    });
    const b = makeCandidate({
      profileId: "b",
      firstName: "Bo",
      gender: "Man",
      hobbies: [hobby("h9", "Football", "Sports", "passionate")],
      personalityAnswers: uniformAnswers(1),
    });
    const result = calculateCompatibility(a, b);
    expect(result.breakdown.hobbies).toBe(0);
    expect(result.breakdown.personality).toBeGreaterThan(0.8);
    expect(result.score).toBeGreaterThan(0);
  });

  it("one dominant category cannot dominate the score", () => {
    const gaming = Array.from({ length: 10 }, (_, index) =>
      hobby(`g${index}`, `Game ${index}`, "Gaming", "passionate" as const),
    );
    const single = scoreHobbies(findSharedHobbies(gaming, gaming));
    const broad = scoreHobbies(findSharedHobbies(musicHobbies("passionate"), musicHobbies("passionate")));
    expect(single).toBeLessThanOrEqual(0.25 + 1e-9);
    expect(broad).toBeGreaterThan(single);
  });
});

describe("hard filters", () => {
  const viewer = makeCandidate({
    profileId: "viewer",
    firstName: "Ada",
    age: 30,
    gender: "Woman",
    preferences: { minAge: 27, maxAge: 35, maxDistanceKm: 50, preferredGenders: ["Men"], relationshipIntent: null },
  });

  it("case 4: candidate outside the age range is filtered out", () => {
    const candidate = makeCandidate({
      profileId: "c",
      firstName: "Bo",
      age: 55,
      gender: "Man",
      preferences: { minAge: 18, maxAge: 99, maxDistanceKm: null, preferredGenders: ["Women"], relationshipIntent: null },
    });
    expect(checkEligibility(viewer, candidate).reason).toBe("candidate_age_out_of_range");
    expect(rankCandidates(viewer, [candidate])).toHaveLength(0);
  });

  it("viewer outside the candidate's age range is filtered out", () => {
    const candidate = makeCandidate({
      profileId: "c",
      firstName: "Bo",
      age: 30,
      gender: "Man",
      preferences: { minAge: 18, maxAge: 25, maxDistanceKm: null, preferredGenders: ["Women"], relationshipIntent: null },
    });
    expect(checkEligibility(viewer, candidate).reason).toBe("viewer_age_out_of_range");
  });

  it("case 5: mismatched gender preferences filter both ways", () => {
    const wrongGender = makeCandidate({
      profileId: "c",
      firstName: "Cara",
      age: 30,
      gender: "Woman",
      preferences: { minAge: 18, maxAge: 99, maxDistanceKm: null, preferredGenders: ["Men"], relationshipIntent: null },
    });
    expect(checkEligibility(viewer, wrongGender).reason).toBe("candidate_gender_not_preferred");

    const wontWantViewer = makeCandidate({
      profileId: "d",
      firstName: "Dev",
      age: 30,
      gender: "Man",
      preferences: { minAge: 18, maxAge: 99, maxDistanceKm: null, preferredGenders: ["Men"], relationshipIntent: null },
    });
    expect(checkEligibility(viewer, wontWantViewer).reason).toBe("viewer_gender_not_preferred");
  });

  it("distance beyond either maximum filters the candidate out", () => {
    const candidate = makeCandidate({
      profileId: "c",
      firstName: "Bo",
      age: 30,
      gender: "Man",
      preferences: { minAge: 18, maxAge: 99, maxDistanceKm: null, preferredGenders: ["Women"], relationshipIntent: null },
    });
    expect(checkEligibility(viewer, candidate, 20).eligible).toBe(true);
    expect(checkEligibility(viewer, candidate, 400).reason).toBe("distance_exceeds_max");
  });

  it("'everyone' and unstated preferences never exclude anyone", () => {
    expect(genderIsPreferred("Woman", ["Everyone"])).toBe(true);
    expect(genderIsPreferred("Non-binary", [])).toBe(true);
    expect(genderIsPreferred("Prefer not to say", ["Men"])).toBe(true);
    expect(genderIsPreferred("Woman", ["Men"])).toBe(false);
  });
});

describe("intent and location", () => {
  it("case 6: aligned intent contributes positively", () => {
    expect(scoreIntent("long_term_relationship", "long_term_relationship")).toBe(1);
    expect(scoreIntent("long_term_relationship", "serious_dating")).toBeGreaterThan(0.8);
  });

  it("case 7: conflicting intent contributes less", () => {
    expect(scoreIntent("long_term_relationship", "friendship_first")).toBeLessThan(0.4);
    expect(scoreIntent("long_term_relationship", null)).toBe(0.5);
  });

  it("case 8: same city scores full location compatibility", () => {
    expect(scoreLocation("Bengaluru", "bengaluru ")).toBe(1);
    expect(scoreLocation("Bengaluru", "Mumbai")).toBeLessThan(1);
    expect(scoreLocation("Bengaluru", "Mumbai", 10)).toBe(1);
    expect(scoreLocation("Bengaluru", "Mumbai", 900)).toBeLessThan(0.2);
  });
});

describe("overall score and explanations", () => {
  const viewer = makeCandidate({
    profileId: "viewer",
    firstName: "Ada",
    age: 30,
    gender: "Woman",
    city: "Bengaluru",
    hobbies: musicHobbies("passionate"),
    personalityAnswers: uniformAnswers(1),
    preferences: {
      minAge: 25,
      maxAge: 40,
      maxDistanceKm: null,
      preferredGenders: ["Men"],
      relationshipIntent: "long_term_relationship",
    },
  });

  const strongMatch = makeCandidate({
    profileId: "strong",
    firstName: "Bo",
    age: 32,
    gender: "Man",
    city: "Bengaluru",
    hobbies: musicHobbies("passionate"),
    personalityAnswers: uniformAnswers(1),
    preferences: {
      minAge: 25,
      maxAge: 40,
      maxDistanceKm: null,
      preferredGenders: ["Women"],
      relationshipIntent: "long_term_relationship",
    },
  });

  const weakMatch = makeCandidate({
    profileId: "weak",
    firstName: "Cal",
    age: 33,
    gender: "Man",
    city: "Mumbai",
    hobbies: [hobby("z1", "Esports", "Gaming", "casual")],
    personalityAnswers: uniformAnswers(4),
    preferences: {
      minAge: 25,
      maxAge: 40,
      maxDistanceKm: null,
      preferredGenders: ["Women"],
      relationshipIntent: "friendship_first",
    },
  });

  it("is deterministic and bounded 0-100", () => {
    const first = calculateCompatibility(viewer, strongMatch);
    const second = calculateCompatibility(viewer, strongMatch);
    expect(first).toEqual(second);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(first.score).toBeGreaterThan(calculateCompatibility(viewer, weakMatch).score);
  });

  it("returns deterministic, data-derived reasons", () => {
    const { reasons } = calculateCompatibility(viewer, strongMatch);
    expect(reasons.length).toBeGreaterThan(2);
    expect(reasons.some((reason) => reason.includes("passionate interest"))).toBe(true);
    expect(reasons).toContain("You share 5 interests.");
    expect(reasons).toContain("You're both in Bengaluru.");
    expect(reasons).toContain("You're within each other's preferred age range.");
  });

  it("ranks candidates by score and excludes the viewer", () => {
    const ranked = rankCandidates(viewer, [weakMatch, strongMatch, viewer]);
    expect(ranked.map((match) => match.profileId)).toEqual(["strong", "weak"]);
    // Bio is public profile content; identity and matching internals are not.
    expect(ranked[0]).not.toHaveProperty("gender");
    expect(ranked[0]).not.toHaveProperty("personalityAnswers");
    expect(ranked[0]).not.toHaveProperty("preferences");
  });
});

describe("collected matching preferences", () => {
  const base = (id: string, extra: Partial<Parameters<typeof makeCandidate>[0]> = {}) =>
    makeCandidate({ profileId: id, firstName: id, ...extra });

  it("suggests an editable age range around the member's own age", () => {
    expect(suggestedAgeRange(21)).toEqual({ minAge: 20, maxAge: 26 });
    expect(suggestedAgeRange(18).minAge).toBe(18);
    expect(suggestedAgeRange(null)).toEqual({ minAge: 18, maxAge: 99 });
  });

  it("filters out other cities when either side chose 'same city'", () => {
    const viewer = base("viewer", { preferences: { ...defaultPreferences(), maxDistanceKm: SAME_CITY_ONLY_KM } });
    const sameTown = base("same", { city: "Bengaluru" });
    const elsewhere = base("far", { city: "Mumbai" });
    expect(checkEligibility(viewer, sameTown).eligible).toBe(true);
    expect(checkEligibility(viewer, elsewhere)).toEqual({
      eligible: false,
      reason: "distance_exceeds_max",
    });
    // Mutual: the candidate's own "same city" rule applies too.
    const openViewer = base("open", { city: "Mumbai" });
    const strict = base("strict", { city: "Bengaluru", preferences: { ...defaultPreferences(), maxDistanceKm: SAME_CITY_ONLY_KM } });
    expect(checkEligibility(openViewer, strict).eligible).toBe(false);
  });

  it("respects a kilometre limit without treating 'same city' as 0 km", () => {
    const viewer = base("viewer", { preferences: { ...defaultPreferences(), maxDistanceKm: 25 } });
    const candidate = base("candidate", { city: "Bengaluru" });
    expect(checkEligibility(viewer, candidate, 10).eligible).toBe(true);
    expect(checkEligibility(viewer, candidate, 40).reason).toBe("distance_exceeds_max");
  });

  it("scores collected relationship intent deterministically", () => {
    expect(scoreIntent("long_term_relationship", "long_term_relationship")).toBe(1);
    expect(scoreIntent("friendship_first", "friendship_first")).toBe(1);
    expect(scoreIntent("long_term_relationship", "serious_dating")).toBeGreaterThan(0.8);
    expect(scoreIntent("open_to_seeing", "serious_dating")).toBeGreaterThan(0.5);
    expect(scoreIntent("friendship_first", "long_term_relationship")).toBeLessThan(0.5);
    // Symmetric in both directions.
    expect(scoreIntent("serious_dating", "friendship_first")).toBe(
      scoreIntent("friendship_first", "serious_dating"),
    );
  });

  it("lets collected intent move the final score", () => {
    const aligned = calculateCompatibility(
      base("a", { preferences: { ...defaultPreferences(), relationshipIntent: "long_term_relationship" } }),
      base("b", { preferences: { ...defaultPreferences(), relationshipIntent: "long_term_relationship" } }),
    );
    const clashing = calculateCompatibility(
      base("a", { preferences: { ...defaultPreferences(), relationshipIntent: "long_term_relationship" } }),
      base("c", { preferences: { ...defaultPreferences(), relationshipIntent: "friendship_first" } }),
    );
    expect(aligned.score).toBeGreaterThan(clashing.score);
    expect(aligned.reasons).toContain("You're both looking for a long-term relationship.");
    expect(clashing.reasons).toContain("You're looking for different kinds of relationship.");
  });

  it("never exposes preference data in a public match", () => {
    const viewer = base("viewer", { preferences: { ...defaultPreferences(), relationshipIntent: "serious_dating" } });
    const other = base("other", { preferences: { ...defaultPreferences(), relationshipIntent: "serious_dating", maxDistanceKm: 25 } });
    const [match] = rankCandidates(viewer, [other]);
    expect(match).toBeDefined();
    expect(Object.keys(match!)).not.toContain("preferences");
    expect(JSON.stringify(match)).not.toContain("serious_dating");
  });
});

describe("discovery projection", () => {
  it("flags and front-loads interests the viewer also selected", () => {
    const viewer = makeCandidate({
      profileId: "viewer",
      firstName: "Viewer",
      hobbies: [hobby("h1", "Photography", "Arts", "passionate")],
      personalityAnswers: uniformAnswers(1),
    });
    const other = makeCandidate({
      profileId: "other",
      firstName: "Other",
      hobbies: [
        hobby("h2", "Chess", "Gaming", "casual"),
        hobby("h1", "Photography", "Arts", "passionate"),
      ],
      personalityAnswers: uniformAnswers(1),
      bio: "Long walks and longer conversations.",
    });
    const [match] = rankCandidates(viewer, [other]);
    expect(match!.hobbies[0]).toMatchObject({ name: "Photography", shared: true });
    expect(match!.hobbies[1]).toMatchObject({ name: "Chess", shared: false });
    expect(match!.bio).toBe("Long walks and longer conversations.");
    expect(match!.photoUrl).toBeNull();
  });

  it("describes personality deterministically without type labels", () => {
    const traits = personalityTraits(uniformAnswers(1));
    expect(traits).toEqual(personalityTraits(uniformAnswers(1)));
    expect(traits.length).toBeGreaterThan(0);
    expect(traits.join(" ")).not.toMatch(/introvert|extrovert|INTJ|ENFP/i);
  });

  it("returns no traits when the quiz has not been answered", () => {
    expect(personalityTraits({})).toEqual([]);
  });
});
