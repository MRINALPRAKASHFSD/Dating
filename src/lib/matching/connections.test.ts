/**
 * Connection rules: pair normalisation, mutual interest, conversation starters
 * and the privacy of the connection payload. Pure in-memory fixtures only —
 * nothing here touches the database.
 */
import { describe, expect, it } from "vitest";

import {
  conversationStarter,
  isMutualInterest,
  normalisePair,
  toPublicConnection,
} from "./connections";
import { calculateCompatibility, toPublicMatch } from "./engine";
import { hobby, makeCandidate, uniformAnswers } from "./fixtures";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

describe("pair normalisation", () => {
  it("treats A+B and B+A as the same pair", () => {
    expect(normalisePair(ID_A, ID_B)).toEqual(normalisePair(ID_B, ID_A));
  });

  it("always stores the lower id first", () => {
    const pair = normalisePair(ID_B, ID_A);
    expect(pair.profileAId < pair.profileBId).toBe(true);
  });
});

describe("mutual interest rule", () => {
  it("does not match on one-sided interest", () => {
    expect(isMutualInterest("interested", null)).toBe(false);
    expect(isMutualInterest(null, "interested")).toBe(false);
  });

  it("matches only when both sides are interested", () => {
    expect(isMutualInterest("interested", "interested")).toBe(true);
  });

  it("never matches on a pass or a withdrawal", () => {
    expect(isMutualInterest("interested", "passed")).toBe(false);
    expect(isMutualInterest("withdrawn", "interested")).toBe(false);
  });
});

describe("conversation starter", () => {
  const passionateShared = [
    { name: "Photography", category: "Arts", intensity: "passionate" as const, shared: true },
    { name: "Baking", category: "Food", intensity: "casual" as const, shared: true },
    { name: "Chess", category: "Gaming", intensity: "passionate" as const, shared: false },
  ];

  it("uses an interest both people actually chose", () => {
    const starter = conversationStarter(passionateShared)!;
    expect(starter).toContain("photography");
    expect(starter).not.toContain("chess");
  });

  it("is deterministic for the same shared interests", () => {
    expect(conversationStarter(passionateShared)).toBe(
      conversationStarter([...passionateShared].reverse()),
    );
  });

  it("returns nothing when there is no shared interest", () => {
    expect(conversationStarter([{ ...passionateShared[0]!, shared: false }])).toBeNull();
  });
});

describe("connection payload", () => {
  const viewer = makeCandidate({
    profileId: ID_A,
    firstName: "Viewer",
    hobbies: [hobby("h1", "Photography", "Arts", "passionate")],
    personalityAnswers: uniformAnswers(1),
  });
  const partner = makeCandidate({
    profileId: ID_B,
    firstName: "Aanya",
    bio: "Long walks and longer playlists.",
    hobbies: [hobby("h1", "Photography", "Arts", "passionate")],
    personalityAnswers: uniformAnswers(1),
  });

  const connection = toPublicConnection(
    toPublicMatch(partner, calculateCompatibility(viewer, partner), viewer.hobbies),
    {
      matchId: "33333333-3333-4333-8333-333333333333",
      matchedAt: "2026-01-02T10:00:00.000Z",
      status: "active",
      isNew: true,
    },
  );

  it("carries the engine's own score and reasons", () => {
    const direct = calculateCompatibility(viewer, partner);
    expect(connection.compatibilityScore).toBe(direct.score);
    expect(connection.compatibilityReasons).toEqual(direct.reasons);
  });

  it("builds the starter from actual shared interests", () => {
    expect(connection.conversationStarter).toContain("photography");
  });

  it("never exposes private preference or auth data", () => {
    const keys = Object.keys(connection);
    for (const forbidden of [
      "email",
      "preferences",
      "minAge",
      "maxAge",
      "preferredGenders",
      "maxDistanceKm",
      "relationshipIntent",
      "gender",
    ]) {
      expect(keys).not.toContain(forbidden);
    }
    expect(JSON.stringify(connection)).not.toContain("relationship_intent");
  });
});
