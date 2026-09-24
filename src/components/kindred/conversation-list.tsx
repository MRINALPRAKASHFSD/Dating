/**
 * Conversation list for the messages route.
 *
 * Shows mutual connections that have conversations, with last message
 * preview, timestamp, and unread indicator. Uses the editorial Kindred
 * styling, not a generic messaging-app clone.
 */
import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";

import type { ConversationSummary } from "@/lib/messaging/types";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function messagePreview(conv: ConversationSummary, userId: string): string {
  if (!conv.lastMessage) return "Start a conversation…";
  const prefix = conv.lastMessage.senderId === userId ? "You: " : "";
  const content =
    conv.lastMessage.messageType === "deep_talk_prompt"
      ? "🌟 Deep Talk prompt"
      : conv.lastMessage.content;
  const truncated = content.length > 60 ? content.slice(0, 57) + "…" : content;
  return `${prefix}${truncated}`;
}

export function ConversationList({
  conversations,
  userId,
}: {
  conversations: ConversationSummary[];
  userId: string;
}) {
  if (conversations.length === 0) {
    return <EmptyConversations />;
  }

  return (
    <ul className="space-y-2">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <Link
            to="/messages/$conversationId"
            params={{ conversationId: conv.id }}
            className="flex items-start gap-4 rounded-2xl border border-border/50 bg-background p-4 transition-colors hover:border-accent/40"
          >
            {/* Avatar placeholder */}
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <span className="text-[18px] font-semibold">
                {conv.partner.firstName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-[15px] font-medium",
                    conv.unreadCount > 0 ? "text-primary font-semibold" : "text-primary",
                  )}
                >
                  {conv.partner.firstName}
                </p>
                {conv.lastMessage && (
                  <time className="shrink-0 text-[12px] text-muted-foreground">
                    {formatRelativeTime(conv.lastMessage.createdAt)}
                  </time>
                )}
              </div>
              <p
                className={cn(
                  "mt-0.5 truncate text-[14px] leading-relaxed",
                  conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {messagePreview(conv, userId)}
              </p>
            </div>

            {conv.unreadCount > 0 && (
              <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyConversations() {
  return (
    <section className="rounded-2xl border border-border/50 bg-background p-8 text-center">
      <MessageSquare className="mx-auto size-8 text-muted-foreground/50" />
      <h2 className="mt-4 font-display text-2xl tracking-tight text-primary">
        No conversations yet.
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        When you start a conversation with a connection, it'll appear here.
      </p>
      <div className="mt-6">
        <Link
          to="/connections"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          View connections →
        </Link>
      </div>
    </section>
  );
}
