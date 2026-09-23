/**
 * Pure connection logic: pair normalisation, the mutual-interest rule and the
 * deterministic conversation starter. No database access, no randomness, no AI.
 */
import type { InterestStatus, PublicHobby, PublicMatch } from "./types";

/** Connection status stored on the `matches` row. */
export type ConnectionStatus = "active" | "unmatched";

/**
 * A + B and B + A are the same pair. Ordering the two ids makes the database
 * uniqueness constraint impossible to bypass by reversing them.
 */
export function normalisePair(x: string, y: string): { profileAId: string; profileBId: string } {
  return x < y ? { profileAId: x, profileBId: y } : { profileAId: y, profileBId: x };
}

/**
 * A connection exists only when both people independently recorded interest.
 * One-sided interest never creates a match.
 */
export function isMutualInterest(
  outgoing: InterestStatus | null,
  reciprocal: InterestStatus | null,
): boolean {
  return outgoing === "interested" && reciprocal === "interested";
}

/** Category-level prompts, used when a shared interest has no specific line. */
const CATEGORY_PROMPTS: Record<string, string> = {
  Music: "What have you had on repeat lately?",
  Sports: "What got you into it?",
  Technology: "What have you been tinkering with recently?",
  Arts: "What are you working on at the moment?",
  Food: "What's the last thing you made that you were proud of?",
  Outdoors: "Where did you last head out to?",
  Books: "What's the last one that stayed with you?",
  Film: "What's the last one you couldn't stop thinking about?",
  Wellness: "How does it fit into your week?",
  Gaming: "What are you playing at the moment?",
};

/** A handful of interest-specific prompts for the most evocative interests. */
const HOBBY_PROMPTS: Record<string, string> = {
  photography: "What's something you've enjoyed photographing recently?",
  travel: "What's the place you'd go back to tomorrow?",
  cooking: "What's the dish you make when you want to impress someone?",
  reading: "What's on your bedside table right now?",
  hiking: "What's the best trail you've walked?",
  running: "Where's your favourite route?",
  coffee: "Where do you go for the best cup in town?",
};

/**
 * Builds one conversation starter from interests both people actually chose.
 * Deterministic: the same shared interests always produce the same sentence.
 */
export function conversationStarter(hobbies: PublicHobby[]): string | null {
  const shared = hobbies.filter((hobby) => hobby.shared);
  if (shared.length === 0) return null;

  // Prefer an interest both of them feel strongly about, then the first shared
  // one alphabetically so the result never depends on query order.
  const ordered = [...shared].sort(
    (a, b) =>
      Number(b.intensity === "passionate") - Number(a.intensity === "passionate") ||
      a.name.localeCompare(b.name),
  );
  const pick = ordered[0]!;
  const key = pick.name.toLowerCase();
  const prompt = HOBBY_PROMPTS[key] ?? CATEGORY_PROMPTS[pick.category] ?? "What drew you to it?";

  const opener =
    pick.intensity === "passionate"
      ? `You both marked ${key} as a passionate interest.`
      : `You both chose ${key}.`;

  return `${opener} ${prompt}`;
}

/** Exactly what the connections UI is allowed to see. */
export type PublicConnection = PublicMatch & {
  matchId: string;
  matchedAt: string;
  status: ConnectionStatus;
  conversationStarter: string | null;
  /** True until this member has opened the connection at least once. */
  isNew: boolean;
};

export function toPublicConnection(
  match: PublicMatch,
  row: { matchId: string; matchedAt: string; status: ConnectionStatus; isNew: boolean },
): PublicConnection {
  return {
    ...match,
    matchId: row.matchId,
    matchedAt: row.matchedAt,
    status: row.status,
    conversationStarter: conversationStarter(match.hobbies),
    isNew: row.isNew,
  };
}
