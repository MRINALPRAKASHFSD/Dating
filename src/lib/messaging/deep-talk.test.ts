import { describe, expect, it } from "vitest";

import { groupByCategory, scoreCategoryRelevance, selectPrompts } from "./deep-talk";
import type { DeepTalkPrompt } from "./types";
import type { HobbySelection } from "@/lib/matching/types";

const mockPrompts: DeepTalkPrompt[] = [
  {
    id: "p1",
    category: "Values",
    promptText: "What principle would you never compromise on?",
    depthLevel: 3,
    used: false,
  },
  {
    id: "p2",
    category: "Values",
    promptText: "What value do you wish more people took seriously?",
    depthLevel: 2,
    used: false,
  },
  {
    id: "p3",
    category: "Personality",
    promptText: "How do you recharge after a draining week?",
    depthLevel: 1,
    used: false,
  },
  {
    id: "p4",
    category: "Curiosity",
    promptText: "What is something you could talk about for hours?",
    depthLevel: 1,
    used: false,
  },
  {
    id: "p5",
    category: "Relationships",
    promptText: "What makes you feel genuinely understood by someone?",
    depthLevel: 2,
    used: false,
  },
  {
    id: "p6",
    category: "Dreams",
    promptText: "What kind of life are you actually building towards?",
    depthLevel: 4,
    used: false,
  },
  {
    id: "p7",
    category: "Life",
    promptText: "What experience taught you the most about who you are?",
    depthLevel: 3,
    used: false,
  },
];

describe("scoreCategoryRelevance", () => {
  it("scores categories deterministically for identical inputs", () => {
    const context = {
      sharedHobbies: [
        {
          hobbyId: "h1",
          name: "Photography",
          category: "Arts",
          intensity: "passionate" as const,
        },
      ],
      relationshipIntent: "long_term_relationship" as const,
      phase: "ice_breaker" as const,
    };

    const score1 = scoreCategoryRelevance(context);
    const score2 = scoreCategoryRelevance(context);
    expect(score1).toEqual(score2);
  });

  it("boosts categories associated with passionate shared hobbies more than casual", () => {
    const passionateContext = {
      sharedHobbies: [
        {
          hobbyId: "h1",
          name: "Hiking",
          category: "Outdoors",
          intensity: "passionate" as const,
        },
      ],
      relationshipIntent: null,
      phase: "open" as const,
    };

    const casualContext = {
      sharedHobbies: [
        {
          hobbyId: "h1",
          name: "Hiking",
          category: "Outdoors",
          intensity: "casual" as const,
        },
      ],
      relationshipIntent: null,
      phase: "open" as const,
    };

    const passScores = scoreCategoryRelevance(passionateContext);
    const casualScores = scoreCategoryRelevance(casualContext);

    expect(passScores.Life).toBeGreaterThan(casualScores.Life);
    expect(passScores.Values).toBeGreaterThan(casualScores.Values);
  });

  it("applies phase-appropriate nudges", () => {
    const iceBreaker = scoreCategoryRelevance({
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "ice_breaker",
    });

    const deepTalk = scoreCategoryRelevance({
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "deep_talk",
    });

    expect(iceBreaker.Curiosity).toBeGreaterThan(deepTalk.Curiosity);
    expect(deepTalk.Relationships).toBeGreaterThan(iceBreaker.Relationships);
    expect(deepTalk.Values).toBeGreaterThan(iceBreaker.Values);
  });
});

describe("selectPrompts", () => {
  it("never includes used prompts", () => {
    const promptsWithUsed: DeepTalkPrompt[] = [
      { ...mockPrompts[0]!, id: "u1", used: true },
      { ...mockPrompts[1]!, id: "u2", used: false },
    ];

    const selected = selectPrompts(promptsWithUsed, {
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "ice_breaker",
    });

    expect(selected.some((p) => p.used)).toBe(false);
    expect(selected.map((p) => p.id)).not.toContain("u1");
  });

  it("returns empty array when all prompts are used", () => {
    const allUsed = mockPrompts.map((p) => ({ ...p, used: true }));
    const selected = selectPrompts(allUsed, {
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "ice_breaker",
    });

    expect(selected).toEqual([]);
  });

  it("prefers shallower prompts in ice_breaker phase", () => {
    const valuesPrompts: DeepTalkPrompt[] = [
      {
        id: "deep",
        category: "Values",
        promptText: "Deep value question",
        depthLevel: 4,
        used: false,
      },
      {
        id: "shallow",
        category: "Values",
        promptText: "Shallow value question",
        depthLevel: 1,
        used: false,
      },
    ];

    const selected = selectPrompts(valuesPrompts, {
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "ice_breaker",
    });

    expect(selected[0]?.id).toBe("shallow");
  });

  it("prefers deeper prompts in deep_talk phase", () => {
    const valuesPrompts: DeepTalkPrompt[] = [
      {
        id: "deep",
        category: "Values",
        promptText: "Deep value question",
        depthLevel: 4,
        used: false,
      },
      {
        id: "shallow",
        category: "Values",
        promptText: "Shallow value question",
        depthLevel: 1,
        used: false,
      },
    ];

    const selected = selectPrompts(valuesPrompts, {
      sharedHobbies: [],
      relationshipIntent: null,
      phase: "deep_talk",
    });

    expect(selected[0]?.id).toBe("deep");
  });

  it("respects the limit argument", () => {
    const selected = selectPrompts(
      mockPrompts,
      {
        sharedHobbies: [],
        relationshipIntent: null,
        phase: "ice_breaker",
      },
      3,
    );

    expect(selected.length).toBeLessThanOrEqual(3);
  });

  it("is completely deterministic and produces stable results on shuffle", () => {
    const context = {
      sharedHobbies: [
        {
          hobbyId: "h1",
          name: "Coding",
          category: "Technology",
          intensity: "regular" as const,
        },
      ],
      relationshipIntent: "serious_dating" as const,
      phase: "getting_to_know" as const,
    };

    const firstRun = selectPrompts(mockPrompts, context);
    const reversed = [...mockPrompts].reverse();
    const secondRun = selectPrompts(reversed, context);

    expect(firstRun.map((p) => p.id)).toEqual(secondRun.map((p) => p.id));
  });
});

describe("groupByCategory", () => {
  it("groups prompts into all defined categories", () => {
    const grouped = groupByCategory(mockPrompts);

    expect(grouped.Values.length).toBe(2);
    expect(grouped.Personality.length).toBe(1);
    expect(grouped.Curiosity.length).toBe(1);
    expect(grouped.Relationships.length).toBe(1);
    expect(grouped.Dreams.length).toBe(1);
    expect(grouped.Life.length).toBe(1);
  });
});
