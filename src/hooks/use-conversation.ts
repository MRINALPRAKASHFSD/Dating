/**
 * Conversation state management.
 *
 * Handles loading, sending, pagination, retry, read state,
 * and realtime subscription for a single conversation.
 */
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getMessages as getMessagesFn,
  sendMessage as sendMessageFn,
  markMessagesRead as markReadFn,
  getDeepTalkPrompts as getPromptsFn,
  useDeepTalkPrompt as usePromptFn,
} from "@/lib/messaging.functions";
import type { ChatMessage, DeepTalkPrompt } from "@/lib/messaging/types";
import { useMessageSubscription } from "./use-messages";
import { useAuth } from "@/context/auth-context";

export function useConversation(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Server function references.
  const fetchMessages = useServerFn(getMessagesFn);
  const sendMsg = useServerFn(sendMessageFn);
  const markRead = useServerFn(markReadFn);
  const fetchPrompts = useServerFn(getPromptsFn);
  const postPromptMessage = useServerFn(usePromptFn);

  // ── Realtime subscription ──────────────────────────────────────────────
  useMessageSubscription(conversationId);

  // ── Messages query ─────────────────────────────────────────────────────
  const messagesQuery = useQuery({
    queryKey: ["kindred-messages", conversationId],
    queryFn: () => {
      if (!conversationId) return [];
      return fetchMessages({ data: { conversationId } });
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  });

  const messages: ChatMessage[] = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  // ── Load earlier messages (cursor pagination) ──────────────────────────
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(true);

  const loadEarlier = useCallback(async () => {
    if (!conversationId || !hasEarlier || isLoadingEarlier) return;
    const oldest = messages[0];
    if (!oldest) return;

    setIsLoadingEarlier(true);
    try {
      const earlier = await fetchMessages({
        data: { conversationId, before: oldest.createdAt },
      });
      if (earlier.length === 0) {
        setHasEarlier(false);
        return;
      }
      // Prepend earlier messages to cache.
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) => [
        ...earlier,
        ...(old ?? []),
      ]);
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [conversationId, messages, hasEarlier, isLoadingEarlier, fetchMessages, queryClient]);

  // ── Send message ───────────────────────────────────────────────────────
  const [failedMessages, setFailedMessages] = useState<Map<string, ChatMessage>>(new Map());

  const sendMutation = useMutation({
    mutationFn: async (params: {
      content: string;
      messageType?: ("text" | "deep_talk_response") | undefined;
    }) => {
      if (!conversationId) throw new Error("No conversation.");
      return sendMsg({
        data: {
          conversationId,
          content: params.content,
          messageType: params.messageType ?? "text",
        },
      });
    },
    onMutate: async (params) => {
      if (!conversationId || !userId) return;
      // Optimistic message.
      const optimistic: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: userId,
        content: params.content,
        messageType: params.messageType ?? "text",
        deepTalkPromptId: null,
        readAt: null,
        createdAt: new Date().toISOString(),
        state: "sending",
      };
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) => [
        ...(old ?? []),
        optimistic,
      ]);
      return { optimisticId: optimistic.id };
    },
    onSuccess: (serverMsg, _, ctx) => {
      if (!conversationId) return;
      // Replace optimistic message with server response.
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) =>
        (old ?? []).map((msg) => (msg.id === ctx?.optimisticId ? serverMsg : msg)),
      );
      void queryClient.invalidateQueries({ queryKey: ["kindred-conversations"] });
    },
    onError: (_error, params, ctx) => {
      if (!conversationId || !userId) return;
      // Mark optimistic message as failed.
      const failedMsg: ChatMessage = {
        id: ctx?.optimisticId ?? `failed-${Date.now()}`,
        conversationId,
        senderId: userId,
        content: params.content,
        messageType: params.messageType ?? "text",
        deepTalkPromptId: null,
        readAt: null,
        createdAt: new Date().toISOString(),
        state: "failed",
      };
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) =>
        (old ?? []).map((msg) => (msg.id === ctx?.optimisticId ? failedMsg : msg)),
      );
      setFailedMessages((prev) => new Map(prev).set(failedMsg.id, failedMsg));
    },
  });

  // ── Retry failed message ───────────────────────────────────────────────
  const retryMessage = useCallback(
    async (failedId: string) => {
      const failed = failedMessages.get(failedId);
      if (!failed || !conversationId) return;

      // Remove from failed map.
      setFailedMessages((prev) => {
        const next = new Map(prev);
        next.delete(failedId);
        return next;
      });

      // Remove from messages list.
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) =>
        (old ?? []).filter((msg) => msg.id !== failedId),
      );

      // Re-send.
      sendMutation.mutate({
        content: failed.content,
        messageType: failed.messageType as "text" | "deep_talk_response",
      });
    },
    [failedMessages, conversationId, queryClient, sendMutation],
  );

  // ── Mark read ──────────────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: () => {
      if (!conversationId) throw new Error("No conversation.");
      return markRead({ data: { conversationId } });
    },
  });

  // ── Deep Talk prompts ──────────────────────────────────────────────────
  const promptsQuery = useQuery({
    queryKey: ["kindred-deep-talk-prompts", conversationId],
    queryFn: () => {
      if (!conversationId) return [];
      return fetchPrompts({ data: { conversationId } });
    },
    enabled: false, // Only fetch when user opens the Deep Talk panel.
  });

  const useDeepTalkPromptMutation = useMutation({
    mutationFn: async (promptId: string) => {
      if (!conversationId) throw new Error("No conversation.");
      return postPromptMessage({ data: { conversationId, promptId } });
    },
    onSuccess: (serverMsg) => {
      if (!conversationId) return;
      queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) => [
        ...(old ?? []),
        serverMsg,
      ]);
      // Mark the prompt as used.
      queryClient.setQueryData<DeepTalkPrompt[]>(
        ["kindred-deep-talk-prompts", conversationId],
        (old) =>
          (old ?? []).map((p) => (p.id === serverMsg.deepTalkPromptId ? { ...p, used: true } : p)),
      );
      void queryClient.invalidateQueries({ queryKey: ["kindred-conversations"] });
    },
  });

  return useMemo(
    () => ({
      messages,
      isLoading: messagesQuery.isPending,
      isError: messagesQuery.isError,
      error: messagesQuery.error,
      refetch: messagesQuery.refetch,

      // Pagination
      hasEarlier,
      isLoadingEarlier,
      loadEarlier,

      // Sending
      send: (content: string, messageType?: "text" | "deep_talk_response") =>
        sendMutation.mutate({ content, messageType }),
      isSending: sendMutation.isPending,
      retryMessage,
      failedMessages,

      // Read state
      markRead: () => markReadMutation.mutate(),

      // Deep Talk
      prompts: promptsQuery.data ?? [],
      isLoadingPrompts: promptsQuery.isPending,
      fetchPrompts: () => promptsQuery.refetch(),
      useDeepTalkPrompt: (promptId: string) => useDeepTalkPromptMutation.mutate(promptId),
      isUsingPrompt: useDeepTalkPromptMutation.isPending,
    }),
    [
      messages,
      messagesQuery,
      hasEarlier,
      isLoadingEarlier,
      loadEarlier,
      sendMutation,
      retryMessage,
      failedMessages,
      markReadMutation,
      promptsQuery,
      useDeepTalkPromptMutation,
    ],
  );
}
