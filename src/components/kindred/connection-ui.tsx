/**
 * Presentation pieces for interest, mutual connections and the pre-chat
 * introduction. Every number and sentence comes from the matching engine.
 */
import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Compass, Heart, MessageSquare, UserRound } from "lucide-react";

import type { PublicConnection } from "@/lib/matching/connections";
import type { PublicMatch } from "@/lib/matching/types";
import {
  CompatibilityReasons,
  CompatibilityScore,
  InterestTags,
  PersonalitySummary,
  ProfileIdentity,
} from "@/components/kindred/match-ui";
import { PrimaryButton, SecondaryButton } from "@/components/kindred/onboarding-ui";
import { Button } from "@/components/ui/button";
import { BlockConfirmationDialog, ReportUserDialog } from "./safety-dialogs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Discover", icon: Compass },
  { to: "/connections", label: "Connections", icon: Heart },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

/** Minimal three-way navigation shared by the authenticated screens. */
export function KindredNav({ newConnections = 0 }: { newConnections?: number }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Kindred" className="mt-6 flex gap-1 border-b border-border/60">
      {NAV.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-2 border-b-2 px-3 pb-3 text-[14px] font-medium transition-colors",
              active
                ? "border-accent text-primary"
                : "border-transparent text-muted-foreground hover:text-primary",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
            {item.label === "Connections" && newConnections > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                {newConnections}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Calm confirmation after one-sided interest. Reveals nothing about them. */
export function InterestSent({
  firstName,
  onWithdraw,
  pending = false,
}: {
  firstName: string;
  onWithdraw: () => void;
  pending?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-accent/40 bg-accent/5 p-6 motion-safe:animate-step-in">
      <h2 className="font-display text-xl tracking-tight text-primary">Interest sent.</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        They'll appear here if they feel the same.
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onWithdraw}
        disabled={pending}
        className="mt-3 -ml-2 h-11 px-2 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
      >
        Withdraw interest in {firstName}
      </Button>
    </section>
  );
}

/** The mutual-match moment. One gentle transition, no celebration graphics. */
export function MatchConfirmation({
  match,
  onStartConversation,
  onViewProfile,
}: {
  match: PublicMatch;
  onStartConversation: () => void;
  onViewProfile: () => void;
}) {
  return (
    <section className="rounded-2xl border border-accent/40 bg-background p-6 motion-safe:animate-step-in md:p-8">
      <p className="text-[13px] font-medium text-accent-foreground/0" aria-hidden="true" />
      <h2 className="font-display text-3xl leading-tight tracking-tight text-primary">
        You found each other.
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        You both said you'd like to meet. Two people who independently chose to meet.
      </p>

      <div className="mt-7 border-t border-border/50 pt-6">
        <ProfileIdentity
          firstName={match.firstName}
          age={match.age}
          city={match.city}
          photoUrl={match.photoUrl}
          large
        />
        <div className="mt-6">
          <CompatibilityScore score={match.compatibilityScore} />
        </div>
        <div className="mt-6 space-y-6">
          <InterestTags hobbies={match.hobbies.filter((hobby) => hobby.shared)} max={6} />
          <section>
            <h3 className="text-[13px] font-semibold tracking-tight text-primary">
              Why you connected
            </h3>
            <ul className="mt-3 space-y-2">
              {match.compatibilityReasons.slice(0, 4).map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2.5 text-[14px] leading-relaxed text-muted-foreground"
                >
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        <PrimaryButton onClick={onStartConversation}>Start a conversation →</PrimaryButton>
        <SecondaryButton onClick={onViewProfile}>View their profile</SecondaryButton>
      </div>
    </section>
  );
}

const matchedOn = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function ConnectionsList({
  connections,
  onOpen,
}: {
  connections: PublicConnection[];
  onOpen: (matchId: string) => void;
}) {
  return (
    <ul className="space-y-4">
      {connections.map((connection) => (
        <li key={connection.matchId}>
          <button
            type="button"
            onClick={() => onOpen(connection.matchId)}
            className="w-full rounded-2xl border border-border/60 bg-background p-5 text-left transition-colors hover:border-accent/50 md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <ProfileIdentity
                firstName={connection.firstName}
                age={connection.age}
                city={connection.city}
                photoUrl={connection.photoUrl}
              />
              {connection.isNew && (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  New connection
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <CompatibilityScore score={connection.compatibilityScore} />
              <p className="text-[12px] text-muted-foreground">
                Connected {matchedOn(connection.matchedAt)}
              </p>
            </div>
            <div className="mt-5">
              <InterestTags hobbies={connection.hobbies.filter((h) => h.shared)} max={4} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Pre-chat introduction screen with live messaging access. */
export function ConnectionDetail({
  connection,
  onBack,
  onUnmatch,
  pending = false,
}: {
  connection: PublicConnection;
  onBack: () => void;
  onUnmatch: () => void;
  pending?: boolean;
}) {
  const navigate = useNavigate();
  const [startingChat, setStartingChat] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handleStartConversation = async () => {
    setStartingChat(true);
    try {
      const { getOrCreateConversation } = await import("@/lib/messaging.functions");
      const { useServerFn } = await import("@tanstack/react-start");
      // Use direct server function call.
      const result = await getOrCreateConversation({ data: { matchId: connection.matchId } });
      navigate({ to: "/messages/$conversationId", params: { conversationId: result.id } });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setStartingChat(false);
    }
  };
  return (
    <article className="motion-safe:animate-step-in">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="-ml-2 h-11 gap-2 px-2 text-[14px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your connections
      </Button>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background p-6 md:p-8">
        <h1 className="font-display text-3xl leading-tight tracking-tight text-primary">
          You've found a connection.
        </h1>

        <div className="mt-7 border-t border-border/50 pt-6">
          <ProfileIdentity
            firstName={connection.firstName}
            age={connection.age}
            city={connection.city}
            photoUrl={connection.photoUrl}
            large
          />
        </div>

        <div className="mt-6">
          <CompatibilityScore score={connection.compatibilityScore} size="lg" />
        </div>

        <div className="mt-7 space-y-7 md:grid md:grid-cols-2 md:gap-10 md:space-y-0">
          <div className="space-y-7">
            {connection.bio && (
              <section>
                <h3 className="text-[13px] font-semibold tracking-tight text-primary">
                  About {connection.firstName}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {connection.bio}
                </p>
              </section>
            )}
            <InterestTags hobbies={connection.hobbies} max={12} />
            <PersonalitySummary traits={connection.personalityTraits} />
          </div>
          <CompatibilityReasons reasons={connection.compatibilityReasons} />
        </div>

        {connection.conversationStarter && (
          <section className="mt-8 rounded-xl border border-accent/40 bg-accent/5 p-5">
            <h3 className="text-[13px] font-semibold tracking-tight text-primary">
              Conversation starter
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-primary">
              {connection.conversationStarter}
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-3">
          <PrimaryButton onClick={handleStartConversation} disabled={startingChat}>
            {startingChat ? "Opening…" : "Start conversation →"}
          </PrimaryButton>
          <div className="flex items-center justify-center gap-3 pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  className="h-8 px-2 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
                >
                  Unmatch
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display tracking-tight">
                    Unmatch from {connection.firstName}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Your connection will be removed and you won't be able to message each other.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep connection</AlertDialogCancel>
                  <AlertDialogAction onClick={onUnmatch}>Unmatch</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <span className="text-border/60">·</span>

            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setShowBlockDialog(true)}
              className="h-8 px-2 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
            >
              Block
            </Button>

            <span className="text-border/60">·</span>

            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setShowReportDialog(true)}
              className="h-8 px-2 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
            >
              Report
            </Button>
          </div>
        </div>

        <BlockConfirmationDialog
          open={showBlockDialog}
          onOpenChange={setShowBlockDialog}
          targetUserId={connection.profileId}
          targetName={connection.firstName}
          onBlocked={onBack}
        />

        <ReportUserDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          reportedUserId={connection.profileId}
          reportedName={connection.firstName}
          onReported={(alsoBlocked) => {
            if (alsoBlocked) {
              onBack();
            }
          }}
        />
      </div>
    </article>
  );
}

export function EmptyConnections({ onDiscover }: { onDiscover: () => void }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-background p-8 text-center">
      <h2 className="font-display text-2xl tracking-tight text-primary">No connections yet.</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        When someone you both chose becomes a connection, they'll appear here.
      </p>
      <div className="mx-auto mt-7 max-w-xs">
        <SecondaryButton onClick={onDiscover}>Discover people →</SecondaryButton>
      </div>
    </section>
  );
}
