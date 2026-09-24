/** Shared types for the Kindred messaging system. Pure data, no I/O. */

import type { Tables } from "@/integrations/supabase/types";

// ── Database row aliases ────────────────────────────────────────────────

export type ConversationRow = Tables<"conversations">;
export type MessageRow = Tables<"messages">;
export type DeepTalkPromptRow = Tables<"deep_talk_prompts">;
export type ConversationPromptUsageRow = Tables<"conversation_prompt_usage">;

// ── Domain types ────────────────────────────────────────────────────────

export type ConversationPhase = "ice_breaker" | "getting_to_know" | "deep_talk" | "open";

export type MessageType = "text" | "deep_talk_prompt" | "deep_talk_response" | "system";

/** Optimistic state tracked per-message in the UI. */
export type MessageState = "sending" | "sent" | "failed";

/** What the chat UI is allowed to see about the other person. */
export type ChatPartner = {
  profileId: string;
  firstName: string;
  age: number | null;
  city: string | null;
  photoUrl: string | null;
  compatibilityScore: number;
};

/** A message as rendered in the chat thread. */
export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  deepTalkPromptId: string | null;
  readAt: string | null;
  createdAt: string;
  /** Client-only state for optimistic sends. */
  state: MessageState;
};

/** A conversation as seen in the conversation list. */
export type ConversationSummary = {
  id: string;
  matchId: string;
  phase: ConversationPhase;
  partner: ChatPartner;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
    messageType: MessageType;
  } | null;
  unreadCount: number;
  createdAt: string;
};

/** Deep Talk prompt as shown in the picker. */
export type DeepTalkPrompt = {
  id: string;
  category: DeepTalkCategory;
  promptText: string;
  depthLevel: number;
  /** True when this prompt has already been used in the current conversation. */
  used: boolean;
};

export type DeepTalkCategory =
  "Values" | "Personality" | "Life" | "Curiosity" | "Relationships" | "Dreams";

export const DEEP_TALK_CATEGORIES: readonly DeepTalkCategory[] = [
  "Values",
  "Personality",
  "Life",
  "Curiosity",
  "Relationships",
  "Dreams",
] as const;

// ── Conversion helpers ──────────────────────────────────────────────────

export function toMessageType(raw: string): MessageType {
  const valid: MessageType[] = ["text", "deep_talk_prompt", "deep_talk_response", "system"];
  return valid.includes(raw as MessageType) ? (raw as MessageType) : "text";
}

export function toConversationPhase(raw: string): ConversationPhase {
  const valid: ConversationPhase[] = ["ice_breaker", "getting_to_know", "deep_talk", "open"];
  return valid.includes(raw as ConversationPhase) ? (raw as ConversationPhase) : "ice_breaker";
}

export function toChatMessage(row: MessageRow, state: MessageState = "sent"): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: toMessageType(row.message_type),
    deepTalkPromptId: row.deep_talk_prompt_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    state,
  };
}
