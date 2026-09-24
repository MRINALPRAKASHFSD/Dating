/**
 * Full chat view: header, message list, composer, Deep Talk panel.
 *
 * Uses useConversation hook for all state. Presentational components
 * from chat-ui.tsx. Existing design tokens and UI primitives throughout.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageBubble,
  MessageComposer,
  ConversationStarter,
  DeepTalkPanel,
  ConnectionEndedBanner,
  LoadEarlierButton,
  ChatSkeleton,
  ChatError,
  ReportBlockMenu,
} from "./chat-ui";
import { useConversation } from "@/hooks/use-conversation";
import { useAuth } from "@/context/auth-context";
import type { ChatPartner } from "@/lib/messaging/types";

export function ChatScreen({
  conversationId,
  partner,
  conversationStarter,
  isConnectionActive = true,
}: {
  conversationId: string;
  partner: ChatPartner;
  conversationStarter: string | null;
  isConnectionActive?: boolean;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showDeepTalk, setShowDeepTalk] = useState(false);

  const conversation = useConversation(conversationId);

  // Scroll to bottom on new messages.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  // Mark messages as read when the chat is open.
  useEffect(() => {
    if (conversationId && conversation.messages.length > 0) {
      conversation.markRead();
    }
    // Only on mount and when messages arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversation.messages.length]);

  const handleSend = useCallback(
    (content: string) => {
      conversation.send(content);
      setShowDeepTalk(false);
    },
    [conversation],
  );

  const handleDeepTalkOpen = useCallback(() => {
    setShowDeepTalk(true);
    conversation.fetchPrompts();
  }, [conversation]);

  const handleDeepTalkSelect = useCallback(
    (promptId: string) => {
      conversation.useDeepTalkPrompt(promptId);
      setShowDeepTalk(false);
    },
    [conversation],
  );

  const handleUseStarter = useCallback(() => {
    if (conversationStarter) {
      conversation.send(conversationStarter);
    }
  }, [conversation, conversationStarter]);

  const isEmpty = conversation.messages.length === 0 && !conversation.isLoading;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: "/messages" })}
          className="size-10 shrink-0 rounded-full p-0 text-muted-foreground hover:text-primary"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
        </Button>

        <div className="flex-1 min-w-0">
          <p className="truncate text-[15px] font-semibold text-primary">{partner.firstName}</p>
          {partner.city && (
            <p className="truncate text-[12px] text-muted-foreground">{partner.city}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="size-10 shrink-0 rounded-full p-0 text-muted-foreground"
              aria-label="Conversation options"
            >
              <MoreVertical className="size-4.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => navigate({ to: "/connections" })}>
              View connection
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <ReportBlockMenu firstName={partner.firstName} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6">
          {conversation.isLoading ? (
            <ChatSkeleton />
          ) : conversation.isError ? (
            <ChatError onRetry={() => conversation.refetch()} />
          ) : isEmpty ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <ConversationStarter
                firstName={partner.firstName}
                conversationStarter={conversationStarter}
                onUsePrompt={handleUseStarter}
                onStartMyself={() => {
                  // Focus the composer.
                }}
              />
            </div>
          ) : (
            <>
              {conversation.hasEarlier && (
                <LoadEarlierButton
                  onClick={conversation.loadEarlier}
                  isLoading={conversation.isLoadingEarlier}
                />
              )}

              <div className="space-y-3">
                {conversation.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === userId}
                    onRetry={
                      message.state === "failed"
                        ? () => conversation.retryMessage(message.id)
                        : undefined
                    }
                  />
                ))}
              </div>
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* ── Deep Talk Panel ───────────────────────────────────────────── */}
      {showDeepTalk && isConnectionActive && (
        <DeepTalkPanel
          prompts={conversation.prompts}
          isLoading={conversation.isLoadingPrompts}
          onSelect={handleDeepTalkSelect}
          onClose={() => setShowDeepTalk(false)}
          isUsing={conversation.isUsingPrompt}
        />
      )}

      {/* ── Composer / Ended Banner ──────────────────────────────────── */}
      {isConnectionActive ? (
        <MessageComposer
          onSend={handleSend}
          onDeepTalk={handleDeepTalkOpen}
          disabled={conversation.isLoading}
        />
      ) : (
        <ConnectionEndedBanner />
      )}
    </div>
  );
}
