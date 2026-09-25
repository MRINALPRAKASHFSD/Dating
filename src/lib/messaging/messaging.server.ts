/**
 * Server-only messaging data access.
 *
 * Every function takes the caller's id from the verified session (never from
 * client input). Authorization is enforced through the authenticated Supabase
 * client which carries RLS policies, plus explicit server-side checks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  ConversationSummary,
  ChatMessage,
  DeepTalkPrompt,
  DeepTalkCategory,
  MessageRow,
} from "./types";
import { toChatMessage, toConversationPhase, toMessageType } from "./types";

const MESSAGES_PAGE_SIZE = 30;
const MAX_MESSAGE_LENGTH = 4000;

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Verifies the user is a participant of the match behind a conversation,
 * and that the match is active. Returns the match row or throws.
 */
async function verifyConversationAccess(
  supabaseAdmin: SupabaseClient<Database>,
  conversationId: string,
  userId: string,
) {
  const { data: conv, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, match_id")
    .eq("id", conversationId)
    .single();
  if (convError || !conv) throw new Error("Conversation not found.");

  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, profile_a_id, profile_b_id, status")
    .eq("id", conv.match_id)
    .single();
  if (matchError || !match) throw new Error("Match not found.");
  if (match.status !== "active") throw new Error("This connection has ended.");
  if (match.profile_a_id !== userId && match.profile_b_id !== userId) {
    throw new Error("Unauthorized.");
  }

  // Reject access if either participant has blocked the other.
  const partnerId = match.profile_a_id === userId ? match.profile_b_id : match.profile_a_id;
  const { isBlockedPair } = await import("@/lib/safety/safety.server");
  if (await isBlockedPair(userId, partnerId)) {
    throw new Error("This connection is no longer active.");
  }

  return { conversation: conv, match };
}

// ── Conversations ───────────────────────────────────────────────────────

/**
 * Gets or creates the conversation for a match. Only one conversation per
 * match, enforced by the UNIQUE(match_id) constraint.
 */
export async function getOrCreateConversation(
  userId: string,
  matchId: string,
): Promise<{ id: string; phase: string; created: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verify the match exists, is active, and the user participates.
  const { data: match, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, profile_a_id, profile_b_id, status")
    .eq("id", matchId)
    .single();
  if (matchError || !match) throw new Error("Match not found.");
  if (match.status !== "active") throw new Error("This connection has ended.");
  if (match.profile_a_id !== userId && match.profile_b_id !== userId) {
    throw new Error("Unauthorized.");
  }

  // Reject conversation creation if either participant has blocked the other.
  const partnerId = match.profile_a_id === userId ? match.profile_b_id : match.profile_a_id;
  const { isBlockedPair } = await import("@/lib/safety/safety.server");
  if (await isBlockedPair(userId, partnerId)) {
    throw new Error("This connection is no longer active.");
  }

  // Try to find existing conversation.
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("id, phase")
    .eq("match_id", matchId)
    .maybeSingle();

  if (existing) return { id: existing.id, phase: existing.phase, created: false };

  // Create new. The UNIQUE constraint handles race conditions.
  const { data: created, error: createError } = await supabaseAdmin
    .from("conversations")
    .insert({ match_id: matchId })
    .select("id, phase")
    .single();

  if (createError) {
    // Handle unique violation from race condition.
    if (createError.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("conversations")
        .select("id, phase")
        .eq("match_id", matchId)
        .single();
      if (raced) return { id: raced.id, phase: raced.phase, created: false };
    }
    throw createError;
  }

  return { id: created.id, phase: created.phase, created: true };
}

/** All conversations for a user, with partner info and latest message. */
export async function getConversationsFor(userId: string): Promise<ConversationSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Get all active matches for this user.
  const { data: matches, error: matchError } = await supabaseAdmin
    .from("matches")
    .select("id, profile_a_id, profile_b_id, status")
    .or(`profile_a_id.eq.${userId},profile_b_id.eq.${userId}`)
    .eq("status", "active");
  if (matchError) throw matchError;
  if (!matches || matches.length === 0) return [];

  const matchIds = (matches ?? []).map((m) => m.id);

  // Get conversations for those matches.
  const { data: conversations, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, match_id, phase, last_message_at, created_at")
    .in("match_id", matchIds)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (convError) throw convError;
  if (!conversations || conversations.length === 0) return [];

  // Get partner profiles.
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));
  const partnerIds = conversations
    .map((c) => {
      const match = matchById.get(c.match_id);
      return match?.profile_a_id === userId ? match?.profile_b_id : match?.profile_a_id;
    })
    .filter((id): id is string => Boolean(id));

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, age, city")
    .in("id", partnerIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Get latest message per conversation.
  const convIds = conversations.map((c) => c.id);
  const { data: latestMessages } = await supabaseAdmin
    .from("messages")
    .select("conversation_id, content, sender_id, created_at, message_type")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const latestByConv = new Map<
    string,
    {
      conversation_id: string;
      content: string;
      sender_id: string;
      created_at: string;
      message_type: string;
    }
  >();
  for (const msg of latestMessages ?? []) {
    if (!latestByConv.has(msg.conversation_id)) {
      latestByConv.set(msg.conversation_id, msg);
    }
  }

  // Count unread messages per conversation.
  const { data: unreadCounts } = await supabaseAdmin
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", convIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  const unreadByConv = new Map<string, number>();
  for (const row of unreadCounts ?? []) {
    unreadByConv.set(row.conversation_id, (unreadByConv.get(row.conversation_id) ?? 0) + 1);
  }

  const { getBlockedUserIds } = await import("@/lib/safety/safety.server");
  const blockedUserIds = await getBlockedUserIds(userId);

  const summaries: ConversationSummary[] = [];
  for (const conv of conversations) {
    const match = matchById.get(conv.match_id);
    if (!match) continue;
    const partnerId = match.profile_a_id === userId ? match.profile_b_id : match.profile_a_id;
    if (blockedUserIds.has(partnerId)) continue;
    const partner = profileById.get(partnerId);
    if (!partner) continue;

    const latest = latestByConv.get(conv.id);

    summaries.push({
      id: conv.id,
      matchId: conv.match_id,
      phase: toConversationPhase(conv.phase),
      partner: {
        profileId: partnerId,
        firstName: partner.first_name ?? "Someone",
        age: partner.age,
        city: partner.city,
        photoUrl: null,
        compatibilityScore: 0,
      },
      lastMessage: latest
        ? {
            content: latest.content,
            senderId: latest.sender_id,
            createdAt: latest.created_at,
            messageType: toMessageType(latest.message_type),
          }
        : null,
      unreadCount: unreadByConv.get(conv.id) ?? 0,
      createdAt: conv.created_at,
    });
  }

  return summaries;
}

// ── Messages ────────────────────────────────────────────────────────────

/** Fetch the latest page of messages for a conversation. */
export async function getMessages(
  userId: string,
  conversationId: string,
  before?: string,
): Promise<ChatMessage[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await verifyConversationAccess(supabaseAdmin, conversationId, userId);

  let query = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGES_PAGE_SIZE);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Return oldest → newest for display.
  return (data ?? []).reverse().map((row) => toChatMessage(row as MessageRow));
}

/** Send a message. Enforces sender identity server-side. */
export async function sendMessage(
  userId: string,
  conversationId: string,
  content: string,
  messageType: string = "text",
  deepTalkPromptId?: string | null,
): Promise<ChatMessage> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Validate content.
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty.");
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds the ${MAX_MESSAGE_LENGTH} character limit.`);
  }

  // Validate message type.
  const validTypes = ["text", "deep_talk_prompt", "deep_talk_response", "system"];
  if (!validTypes.includes(messageType)) {
    throw new Error("Invalid message type.");
  }

  // Verify access.
  await verifyConversationAccess(supabaseAdmin, conversationId, userId);

  // Insert message — sender_id is always the verified userId, NEVER client-supplied.
  const { data: msg, error: msgError } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: trimmed,
      message_type: messageType,
      deep_talk_prompt_id: deepTalkPromptId ?? null,
    })
    .select("*")
    .single();
  if (msgError) throw msgError;

  // Update conversation's last_message_at.
  await supabaseAdmin
    .from("conversations")
    .update({ last_message_at: msg.created_at })
    .eq("id", conversationId);

  return toChatMessage(msg);
}

/** Mark all messages from the other person as read. */
export async function markMessagesRead(
  userId: string,
  conversationId: string,
): Promise<{ count: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await verifyConversationAccess(supabaseAdmin, conversationId, userId);

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null)
    .select("id");
  if (error) throw error;

  return { count: data?.length ?? 0 };
}

// ── Deep Talk ───────────────────────────────────────────────────────────

/** All prompts with usage status for a specific conversation. */
export async function getDeepTalkPrompts(
  userId: string,
  conversationId: string,
): Promise<DeepTalkPrompt[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await verifyConversationAccess(supabaseAdmin, conversationId, userId);

  const [{ data: prompts }, { data: usedRows }] = await Promise.all([
    supabaseAdmin
      .from("deep_talk_prompts")
      .select("*")
      .order("category", { ascending: true })
      .order("depth_level", { ascending: true }),
    supabaseAdmin
      .from("conversation_prompt_usage")
      .select("prompt_id")
      .eq("conversation_id", conversationId),
  ]);

  const usedIds = new Set((usedRows ?? []).map((row) => row.prompt_id));

  return (prompts ?? []).map((row) => ({
    id: row.id,
    category: row.category as DeepTalkCategory,
    promptText: row.prompt_text,
    depthLevel: row.depth_level,
    used: usedIds.has(row.id),
  }));
}

/** Records that a prompt was used in this conversation and sends it as a message. */
export async function useDeepTalkPrompt(
  userId: string,
  conversationId: string,
  promptId: string,
): Promise<ChatMessage> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await verifyConversationAccess(supabaseAdmin, conversationId, userId);

  // Verify the prompt exists.
  const { data: prompt, error: promptError } = await supabaseAdmin
    .from("deep_talk_prompts")
    .select("id, prompt_text")
    .eq("id", promptId)
    .single();
  if (promptError || !prompt) throw new Error("Prompt not found.");

  // Record usage (unique constraint prevents reuse).
  const { error: usageError } = await supabaseAdmin
    .from("conversation_prompt_usage")
    .insert({ conversation_id: conversationId, prompt_id: promptId });
  if (usageError) {
    if (usageError.code === "23505") {
      throw new Error("This prompt has already been used in this conversation.");
    }
    throw usageError;
  }

  // Send as a Deep Talk prompt message.
  return sendMessage(userId, conversationId, prompt.prompt_text, "deep_talk_prompt", promptId);
}
