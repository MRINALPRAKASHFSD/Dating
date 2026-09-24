import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ConversationSummary, ChatMessage, DeepTalkPrompt } from "@/lib/messaging/types";

// ── Conversations ───────────────────────────────────────────────────────

/** Get or create a conversation for a match. */
export const getOrCreateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ matchId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ id: string; phase: string; created: boolean }> => {
    const { getOrCreateConversation: getOrCreate } =
      await import("@/lib/messaging/messaging.server");
    return getOrCreate(context.userId, data.matchId);
  });

/** All conversations for the authenticated member. */
export const getConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversationSummary[]> => {
    const { getConversationsFor } = await import("@/lib/messaging/messaging.server");
    return getConversationsFor(context.userId);
  });

// ── Messages ────────────────────────────────────────────────────────────

/** Latest messages for a conversation, with cursor-based pagination. */
export const getMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        before: z.string().datetime().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ChatMessage[]> => {
    const { getMessages: fetchMessages } = await import("@/lib/messaging/messaging.server");
    return fetchMessages(context.userId, data.conversationId, data.before);
  });

/** Send a text message. */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        content: z.string().min(1).max(4000),
        messageType: z.enum(["text", "deep_talk_response"]).default("text"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    const { sendMessage: send } = await import("@/lib/messaging/messaging.server");
    return send(context.userId, data.conversationId, data.content, data.messageType);
  });

/** Mark unread messages as read. */
export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ count: number }> => {
    const { markMessagesRead: markRead } = await import("@/lib/messaging/messaging.server");
    return markRead(context.userId, data.conversationId);
  });

// ── Deep Talk ───────────────────────────────────────────────────────────

/** All prompts with per-conversation usage status. */
export const getDeepTalkPrompts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ conversationId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<DeepTalkPrompt[]> => {
    const { getDeepTalkPrompts: fetchPrompts } = await import("@/lib/messaging/messaging.server");
    return fetchPrompts(context.userId, data.conversationId);
  });

/** Select and send a Deep Talk prompt. Records usage to prevent repeats. */
export const useDeepTalkPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conversationId: z.string().uuid(),
        promptId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ChatMessage> => {
    const { useDeepTalkPrompt: usePrompt } = await import("@/lib/messaging/messaging.server");
    return usePrompt(context.userId, data.conversationId, data.promptId);
  });
