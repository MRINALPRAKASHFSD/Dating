/**
 * Supabase Realtime subscription for incoming messages.
 *
 * Subscribes only to the currently open conversation.
 * Cleans up on unmount. Prevents duplicate subscriptions.
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, MessageRow } from "@/lib/messaging/types";
import { toChatMessage } from "@/lib/messaging/types";

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 * Automatically updates the React Query cache when a message arrives.
 */
export function useMessageSubscription(conversationId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Prevent duplicate subscriptions.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = toChatMessage(payload.new as unknown as MessageRow);

          // Append to the cached messages list.
          queryClient.setQueryData<ChatMessage[]>(["kindred-messages", conversationId], (old) => {
            if (!old) return [newMessage];
            // Avoid duplicates (optimistic send may have added it).
            if (old.some((msg) => msg.id === newMessage.id)) return old;
            return [...old, newMessage];
          });

          // Invalidate the conversations list to update last message preview.
          void queryClient.invalidateQueries({ queryKey: ["kindred-conversations"] });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, queryClient]);
}
