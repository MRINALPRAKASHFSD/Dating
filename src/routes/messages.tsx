import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { RequireAuth } from "@/components/kindred/require-auth";
import { KindredHeader } from "@/components/kindred/kindred-header";
import { KindredNav } from "@/components/kindred/connection-ui";
import { ConversationList } from "@/components/kindred/conversation-list";
import { MatchSkeleton, MatchError } from "@/components/kindred/match-ui";
import { getConversations } from "@/lib/messaging.functions";
import { useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Kindred" },
      { name: "description", content: "Your private conversations with mutual connections." },
      { property: "og:title", content: "Messages — Kindred" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <RequireAuth>
      <MessagesScreen />
    </RequireAuth>
  );
}

function MessagesScreen() {
  const { user } = useAuth();
  const fetchConversations = useServerFn(getConversations);

  const conversationsQuery = useQuery({
    queryKey: ["kindred-conversations"],
    queryFn: () => fetchConversations({ data: undefined }),
    staleTime: 15_000,
  });

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg border-x border-border/10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-3xl">
        <KindredHeader />
        <KindredNav />

        <div className="mt-10">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-balance text-primary">
            Messages
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Private conversations with your connections.
          </p>
        </div>

        <div className="mt-8">
          {conversationsQuery.isPending ? (
            <MatchSkeleton />
          ) : conversationsQuery.isError ? (
            <MatchError onRetry={() => void conversationsQuery.refetch()} />
          ) : (
            <ConversationList
              conversations={conversationsQuery.data ?? []}
              userId={user?.id ?? ""}
            />
          )}
        </div>
      </div>
    </main>
  );
}
