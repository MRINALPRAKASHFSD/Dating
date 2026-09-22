import type { PublicMatch } from "@/lib/matching/types";
import {
  CompatibilityReasons,
  CompatibilityScore,
  InterestTags,
  MatchActions,
  PersonalitySummary,
  ProfileIdentity,
} from "@/components/kindred/match-ui";
import { Button } from "@/components/ui/button";

export function MatchCard({
  match,
  pending = false,
  onOpen,
  onInterested,
  onPass,
}: {
  match: PublicMatch;
  pending?: boolean;
  onOpen: () => void;
  onInterested: () => void;
  onPass: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-background p-6 motion-safe:animate-step-in md:p-7">
      <ProfileIdentity
        firstName={match.firstName}
        age={match.age}
        city={match.city}
        photoUrl={match.photoUrl}
      />

      <div className="mt-6 border-t border-border/50 pt-5">
        <CompatibilityScore score={match.compatibilityScore} />
      </div>

      <div className="mt-5 space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
        <CompatibilityReasons reasons={match.compatibilityReasons} />
        <div className="space-y-6">
          <InterestTags hobbies={match.hobbies} />
          <PersonalitySummary traits={match.personalityTraits} />
        </div>
      </div>

      {match.bio && (
        <p className="mt-6 line-clamp-3 text-[14px] leading-relaxed text-muted-foreground">{match.bio}</p>
      )}

      <div className="mt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onOpen}
          className="h-11 px-0 text-[14px] font-semibold text-primary underline-offset-4 hover:bg-transparent hover:underline"
        >
          Read {match.firstName}'s full profile →
        </Button>
      </div>

      <div className="mt-2">
        <MatchActions
          firstName={match.firstName}
          onInterested={onInterested}
          onPass={onPass}
          pending={pending}
        />
      </div>
    </article>
  );
}
