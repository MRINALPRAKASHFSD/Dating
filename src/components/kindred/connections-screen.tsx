import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import {
  getConnections,
  markConnectionSeen,
  unmatchConnection,
} from "@/lib/connections.functions";
import type { PublicConnection } from "@/lib/matching/connections";
import {
  ConnectionDetail,
  ConnectionsList,
  EmptyConnections,
  KindredNav,
} from "@/components/kindred/connection-ui";
import { MatchError, MatchSkeleton } from "@/components/kindred/match-ui";
import { KindredHeader } from "@/components/kindred/kindred-header";

export function ConnectionsScreen({ initialMatchId }: { initialMatchId?: string | undefined }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchConnections = useServerFn(getConnections);
  const endConnection = useServerFn(unmatchConnection);
  const markSeen = useServerFn(markConnectionSeen);

  const [openMatchId, setOpenMatchId] = useState<string | null>(initialMatchId ?? null);

  const connectionsQuery = useQuery({
    queryKey: ["kindred-connections"],
    queryFn: () => fetchConnections({ data: undefined }),
    staleTime: 30_000,
  });

  const connections: PublicConnection[] = connectionsQuery.data ?? [];
  const open = connections.find((connection) => connection.matchId === openMatchId) ?? null;

  // Opening a connection clears its "new connection" state for this member.
  useEffect(() => {
    if (!open || !open.isNew) return;
    void markSeen({ data: { matchId: open.matchId } }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["kindred-connections"] }),
    );
  }, [open, markSeen, queryClient]);

  const unmatchMutation = useMutation({
    mutationFn: (matchId: string) => endConnection({ data: { matchId } }),
    onSuccess: () => {
      setOpenMatchId(null);
      void queryClient.invalidateQueries({ queryKey: ["kindred-connections"] });
      void queryClient.invalidateQueries({ queryKey: ["kindred-matches"] });
    },
  });

  const newCount = connections.filter((connection) => connection.isNew).length;

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg border-x border-border/10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-3xl">
        <KindredHeader />
        <KindredNav newConnections={newCount} />

        {open ? (
          <div className="mt-8">
            <ConnectionDetail
              connection={open}
              pending={unmatchMutation.isPending}
              onBack={() => setOpenMatchId(null)}
              onUnmatch={() => unmatchMutation.mutate(open.matchId)}
            />
          </div>
        ) : (
          <>
            <div className="mt-10">
              <h1 className="font-display text-4xl leading-tight tracking-tight text-balance text-primary">
                Your connections
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                People you both chose to meet.
              </p>
            </div>

            <div className="mt-8">
              {connectionsQuery.isPending ? (
                <MatchSkeleton />
              ) : connectionsQuery.isError ? (
                <MatchError onRetry={() => void connectionsQuery.refetch()} />
              ) : connections.length === 0 ? (
                <EmptyConnections onDiscover={() => navigate({ to: "/home" })} />
              ) : (
                <ConnectionsList connections={connections} onOpen={setOpenMatchId} />
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
