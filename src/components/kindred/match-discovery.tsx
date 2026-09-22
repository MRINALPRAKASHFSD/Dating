import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { getCompatibleMatches, recordInterest } from "@/lib/matching.functions";
import { getConnections } from "@/lib/connections.functions";
import type { InterestStatus, PublicMatch } from "@/lib/matching/types";
import { MatchCard } from "@/components/kindred/match-card";
import { ProfileDetail } from "@/components/kindred/profile-detail";
import { EmptyMatches, MatchError, MatchSkeleton } from "@/components/kindred/match-ui";
import {
  InterestSent,
  KindredNav,
  MatchConfirmation,
} from "@/components/kindred/connection-ui";
import { KindredHeader } from "@/components/kindred/kindred-header";

const DISCOVERY_PAGE_SIZE = 10;

export function MatchDiscovery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchMatches = useServerFn(getCompatibleMatches);
  const fetchConnections = useServerFn(getConnections);
  const saveInterest = useServerFn(recordInterest);

  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [decided, setDecided] = useState<string[]>([]);
  const [sent, setSent] = useState<PublicMatch[]>([]);
  const [confirmed, setConfirmed] = useState<{ match: PublicMatch; matchId: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const matchesQuery = useQuery({
    queryKey: ["kindred-matches"],
    queryFn: () => fetchMatches({ data: { limit: DISCOVERY_PAGE_SIZE } }),
    staleTime: 60_000,
  });

  const connectionsQuery = useQuery({
    queryKey: ["kindred-connections"],
    queryFn: () => fetchConnections({ data: undefined }),
    staleTime: 30_000,
  });
  const newConnections = (connectionsQuery.data ?? []).filter((c) => c.isNew).length;

  const interestMutation = useMutation({
    mutationFn: (input: { toProfileId: string; status: InterestStatus }) =>
      saveInterest({ data: input }),
    onSuccess: (result, input) => {
      setActionError(null);
      setOpenProfileId(null);
      const match = (matchesQuery.data ?? []).find((m) => m.profileId === input.toProfileId);

      if (input.status === "withdrawn") {
        setSent((current) => current.filter((m) => m.profileId !== input.toProfileId));
        setDecided((current) => current.filter((id) => id !== input.toProfileId));
        return;
      }

      setDecided((current) => [...current, input.toProfileId]);
      if (input.status === "interested" && match) {
        if (result.mutual && result.matchId) {
          // Mutual interest: the server created the connection.
          setConfirmed({ match, matchId: result.matchId });
          void queryClient.invalidateQueries({ queryKey: ["kindred-connections"] });
        } else {
          setSent((current) => [match, ...current]);
        }
      }
    },
    onError: () => setActionError("We couldn't save that just now. Please try again."),
  });

  const matches: PublicMatch[] = (matchesQuery.data ?? []).filter(
    (match) => !decided.includes(match.profileId),
  );
  const openProfile = matches.find((match) => match.profileId === openProfileId) ?? null;

  const decide = (toProfileId: string, status: InterestStatus) =>
    interestMutation.mutate({ toProfileId, status });

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-lg border-x border-border/10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-3xl">
        <KindredHeader />
        <KindredNav newConnections={newConnections} />

        {confirmed ? (
          <div className="mt-8">
            <MatchConfirmation
              match={confirmed.match}
              onStartConversation={() =>
                navigate({ to: "/connections", search: { match: confirmed.matchId } })
              }
              onViewProfile={() =>
                navigate({ to: "/connections", search: { match: confirmed.matchId } })
              }
            />
          </div>
        ) : openProfile ? (
          <div className="mt-8">
            <ProfileDetail
              match={openProfile}
              pending={interestMutation.isPending}
              onBack={() => setOpenProfileId(null)}
              onInterested={() => decide(openProfile.profileId, "interested")}
              onPass={() => decide(openProfile.profileId, "passed")}
            />
          </div>
        ) : (
          <>
            <div className="mt-10">
              <h1 className="font-display text-4xl leading-tight tracking-tight text-balance text-primary">
                Your Kindred
              </h1>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                People whose interests, personality and intentions align with yours.
              </p>
            </div>

            {actionError && (
              <p role="alert" className="mt-6 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-medium text-destructive">
                {actionError}
              </p>
            )}

            <div className="mt-8 space-y-6">
              {sent.map((match) => (
                <InterestSent
                  key={match.profileId}
                  firstName={match.firstName}
                  pending={interestMutation.isPending}
                  onWithdraw={() => decide(match.profileId, "withdrawn")}
                />
              ))}

              {matchesQuery.isPending ? (
                <MatchSkeleton />
              ) : matchesQuery.isError ? (
                <MatchError onRetry={() => void matchesQuery.refetch()} />
              ) : matches.length === 0 ? (
                sent.length === 0 && (
                  <EmptyMatches onReviewPreferences={() => navigate({ to: "/preferences" })} />
                )
              ) : (
                matches.map((match) => (
                  <MatchCard
                    key={match.profileId}
                    match={match}
                    pending={interestMutation.isPending}
                    onOpen={() => setOpenProfileId(match.profileId)}
                    onInterested={() => decide(match.profileId, "interested")}
                    onPass={() => decide(match.profileId, "passed")}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
