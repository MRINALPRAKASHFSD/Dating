import { ArrowLeft } from "lucide-react";
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

/**
 * Full candidate profile. Shows everything the discovery service returns and
 * nothing else — private matching preferences never reach this component.
 */
export function ProfileDetail({
  match,
  pending = false,
  onBack,
  onInterested,
  onPass,
}: {
  match: PublicMatch;
  pending?: boolean;
  onBack: () => void;
  onInterested: () => void;
  onPass: () => void;
}) {
  return (
    <article className="motion-safe:animate-step-in">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="-ml-2 h-11 gap-2 px-2 text-[14px] font-medium text-muted-foreground hover:bg-transparent hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your Kindred
      </Button>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background p-6 md:p-8">
        <ProfileIdentity
          firstName={match.firstName}
          age={match.age}
          city={match.city}
          photoUrl={match.photoUrl}
          large
        />

        <div className="mt-7 border-t border-border/50 pt-6">
          <CompatibilityScore score={match.compatibilityScore} size="lg" />
        </div>

        <div className="mt-7 space-y-7 md:grid md:grid-cols-2 md:gap-10 md:space-y-0">
          <div className="space-y-7">
            {match.bio && (
              <section>
                <h3 className="text-[13px] font-semibold tracking-tight text-primary">About {match.firstName}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{match.bio}</p>
              </section>
            )}
            <InterestTags hobbies={match.hobbies} max={12} />
            <PersonalitySummary traits={match.personalityTraits} />
          </div>
          <CompatibilityReasons reasons={match.compatibilityReasons} />
        </div>

        <div className="mt-8">
          <MatchActions
            firstName={match.firstName}
            onInterested={onInterested}
            onPass={onPass}
            pending={pending}
          />
        </div>
      </div>
    </article>
  );
}
