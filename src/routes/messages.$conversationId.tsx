import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { RequireAuth } from "@/components/kindred/require-auth";
import { ChatScreen } from "@/components/kindred/chat-screen";
import { getConversations } from "@/lib/messaging.functions";
import { useAuth } from "@/context/auth-context";
import type { ConversationSummary } from "@/lib/messaging/types";

export const Route = createFileRoute("/messages/$conversationId")({
  head: () => ({
    meta: [
      { title: "Chat — Kindred" },
      { name: "description", content: "A private conversation on Kindred." },
      { property: "og:title", content: "Chat — Kindred" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { conversationId } = Route.useParams();
  return (
    <RequireAuth>
      <ChatRoute conversationId={conversationId} />
    </RequireAuth>
  );
}

function ChatRoute({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const fetchConversations = useServerFn(getConversations);

  // Load conversations to find partner info for this conversation.
  const conversationsQuery = useQuery({
    queryKey: ["kindred-conversations"],
    queryFn: () => fetchConversations({ data: undefined }),
    staleTime: 15_000,
  });

  const conversations: ConversationSummary[] = conversationsQuery.data ?? [];
  const current = conversations.find((c) => c.id === conversationId);

  if (conversationsQuery.isPending) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-2xl tracking-tight text-primary">
            Conversation not found
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            This conversation may have been removed or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChatScreen
      conversationId={conversationId}
      partner={current.partner}
      conversationStarter={null}
      isConnectionActive={true}
    />
  );
}
