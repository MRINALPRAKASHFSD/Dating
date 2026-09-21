/**
 * Deterministic personality descriptors.
 *
 * These are NOT personality types. Each descriptor is a plain-language label
 * attached to a specific stored answer of the existing 8-question quiz, so the
 * same answers always produce the same words. No inference, no AI, no labels
 * such as "introvert" or four-letter type codes.
 *
 * Keys are question order (1-based); values are indexed by option order (1-based).
 */
import type { PersonalityAnswers } from "./types";

export const PERSONALITY_TRAITS: Record<number, string[]> = {
  // 1. How do you usually recharge?
  1: ["Reflective", "Close-knit", "Exploratory", "Easy-going"],
  // 2. Your ideal Saturday?
  2: ["Homebody", "Sociable", "Adventurous", "Creative"],
  // 3. When plans suddenly change...
  3: ["Adaptable", "Considered", "Decisive", "Flexible"],
  // 4. How do you usually handle conflict?
  4: ["Direct", "Measured", "Diplomatic", "Conflict-averse"],
  // 5. What matters most in a partner?
  5: ["Emotionally open", "Interest-led", "Values-led", "Growth-minded"],
  // 6.
  6: ["Steady", "Spontaneous", "Planful", "Curious"],
  // 7.
  7: ["Grounded", "Expressive", "Independent", "Collaborative"],
  // 8.
  8: ["Conversation-driven", "Experience-driven", "Depth-seeking", "Companionable"],
};

/** Questions consulted first, so the descriptors cover different ground. */
const TRAIT_PRIORITY = [1, 5, 8, 2, 4, 3, 6, 7];

/** Up to three descriptors, deterministic, from the answers actually given. */
export function personalityTraits(answers: PersonalityAnswers, max = 3): string[] {
  const traits: string[] = [];
  for (const order of TRAIT_PRIORITY) {
    const option = answers[order];
    if (!option) continue;
    const label = PERSONALITY_TRAITS[order]?.[option - 1];
    if (label && !traits.includes(label)) traits.push(label);
    if (traits.length >= max) break;
  }
  return traits;
}
