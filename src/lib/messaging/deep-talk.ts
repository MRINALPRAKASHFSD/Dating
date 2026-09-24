/**
 * Pure deterministic Deep Talk logic.
 *
 * No LLM, no AI, no network requests. Prompt selection considers
 * shared interests, personality alignment, relationship intent,
 * and previously used prompts.
 */

import type { DeepTalkCategory, DeepTalkPrompt, ConversationPhase } from "./types";
import type { HobbySelection, RelationshipIntent } from "@/lib/matching/types";

// ── Category relevance scoring ──────────────────────────────────────────

/**
 * Hobby categories → Deep Talk categories they favour. Each mapping is
 * intentional: travel people tend to enjoy curiosity/life questions,
 * creative people resonate with personality/dreams, and so on.
 */
const HOBBY_CATEGORY_AFFINITY: Record<string, DeepTalkCategory[]> = {
  Music: ["Personality", "Curiosity"],
  Sports: ["Values", "Life"],
  Technology: ["Curiosity", "Dreams"],
  Arts: ["Personality", "Dreams"],
  Food: ["Life", "Curiosity"],
  Outdoors: ["Life", "Values"],
  Books: ["Curiosity", "Values"],
  Film: ["Curiosity", "Personality"],
  Wellness: ["Values", "Relationships"],
  Gaming: ["Curiosity", "Personality"],
};

/**
 * Relationship intent → Deep Talk categories that feel appropriate early on.
 */
const INTENT_CATEGORY_AFFINITY: Record<string, DeepTalkCategory[]> = {
  long_term_relationship: ["Relationships", "Values", "Life"],
  serious_dating: ["Relationships", "Personality", "Values"],
  open_to_seeing: ["Curiosity", "Personality", "Life"],
  friendship_first: ["Curiosity", "Life", "Dreams"],
};

type PromptContext = {
  /** Hobbies both users selected. */
  sharedHobbies: HobbySelection[];
  /** The viewer's relationship intent. */
  relationshipIntent: RelationshipIntent | null;
  /** Current conversation phase. */
  phase: ConversationPhase;
};

/**
 * Scores each Deep Talk category based on user context. Higher = more relevant.
 * The result is deterministic: the same inputs always produce the same scores.
 */
export function scoreCategoryRelevance(context: PromptContext): Record<DeepTalkCategory, number> {
  const scores: Record<DeepTalkCategory, number> = {
    Values: 0,
    Personality: 0,
    Life: 0,
    Curiosity: 0,
    Relationships: 0,
    Dreams: 0,
  };

  // Boost categories that align with shared interests.
  for (const hobby of context.sharedHobbies) {
    const affinities = HOBBY_CATEGORY_AFFINITY[hobby.category] ?? [];
    for (const cat of affinities) {
      scores[cat] += hobby.intensity === "passionate" ? 3 : 1;
    }
  }

  // Boost categories matching relationship intent.
  if (context.relationshipIntent) {
    const intentCats = INTENT_CATEGORY_AFFINITY[context.relationshipIntent] ?? [];
    for (const cat of intentCats) {
      scores[cat] += 2;
    }
  }

  // Phase-based nudges.
  switch (context.phase) {
    case "ice_breaker":
      scores.Curiosity += 2;
      scores.Personality += 1;
      break;
    case "getting_to_know":
      scores.Life += 2;
      scores.Values += 1;
      break;
    case "deep_talk":
      scores.Relationships += 2;
      scores.Values += 2;
      scores.Dreams += 1;
      break;
    case "open":
      // No extra bias — all categories equally valid.
      break;
  }

  return scores;
}

/**
 * Selects the best available prompts, excluding already-used ones.
 *
 * Algorithm:
 * 1. Remove all prompts already used in this conversation.
 * 2. Score each category by relevance.
 * 3. Sort available prompts by (category score DESC, depth ASC for early phases / depth DESC for deep).
 * 4. Return the top N prompts.
 *
 * Deterministic: same inputs always return the same ordering.
 */
export function selectPrompts(
  allPrompts: DeepTalkPrompt[],
  context: PromptContext,
  limit = 5,
): DeepTalkPrompt[] {
  const available = allPrompts.filter((p) => !p.used);
  if (available.length === 0) return [];

  const categoryScores = scoreCategoryRelevance(context);

  // In early phases, prefer shallower prompts; in deep talk, prefer deeper ones.
  const preferDeep = context.phase === "deep_talk" || context.phase === "open";

  const sorted = [...available].sort((a, b) => {
    const catDiff = (categoryScores[b.category] ?? 0) - (categoryScores[a.category] ?? 0);
    if (catDiff !== 0) return catDiff;

    const depthDiff = preferDeep ? b.depthLevel - a.depthLevel : a.depthLevel - b.depthLevel;
    if (depthDiff !== 0) return depthDiff;

    // Stable tie-breaker: alphabetical by prompt text.
    return a.promptText.localeCompare(b.promptText);
  });

  return sorted.slice(0, limit);
}

/**
 * Groups prompts by category for the Deep Talk picker.
 * Categories with all prompts already used are still included (empty arrays).
 */
export function groupByCategory(
  prompts: DeepTalkPrompt[],
): Record<DeepTalkCategory, DeepTalkPrompt[]> {
  const groups: Record<DeepTalkCategory, DeepTalkPrompt[]> = {
    Values: [],
    Personality: [],
    Life: [],
    Curiosity: [],
    Relationships: [],
    Dreams: [],
  };
  for (const prompt of prompts) {
    if (groups[prompt.category]) {
      groups[prompt.category].push(prompt);
    }
  }
  return groups;
}
