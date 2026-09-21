/**
 * Development/test fixtures for the compatibility engine.
 *
 * These are plain in-memory objects used by unit tests only. They are never
 * inserted into the database and never reachable from the running app.
 */
import { defaultPreferences } from "./engine";
import type { HobbySelection, MatchCandidate, MatchPreferences } from "./types";

export const hobby = (
  hobbyId: string,
  name: string,
  category: string,
  intensity: HobbySelection["intensity"],
): HobbySelection => ({ hobbyId, name, category, intensity });

export function makeCandidate(
  overrides: Partial<MatchCandidate> & { profileId: string; firstName: string },
): MatchCandidate {
  const preferences: MatchPreferences = {
    ...defaultPreferences(),
    ...(overrides.preferences ?? {}),
  };
  return {
    age: 30,
    city: "Bengaluru",
    gender: "Woman",
    bio: null,
    hobbies: [],
    personalityAnswers: {},
    ...overrides,
    preferences,
  };
}

/** Answers every quiz question with the same option (1-4). */
export const uniformAnswers = (option: number): Record<number, number> =>
  Object.fromEntries(Array.from({ length: 8 }, (_, index) => [index + 1, option]));
