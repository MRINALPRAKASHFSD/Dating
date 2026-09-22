/**
 * Presentation pieces for match discovery. No scoring logic lives here — every
 * number and sentence is produced by the matching engine and passed in.
 */
import { MapPin } from "lucide-react";
import type { PublicHobby } from "@/lib/matching/types";
import { PrimaryButton, SecondaryButton } from "@/components/kindred/onboarding-ui";
import { cn } from "@/lib/utils";

export function CompatibilityScore({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <p
      className={cn(
        "font-display tracking-tight text-primary",
        size === "lg" ? "text-4xl" : "text-2xl",
      )}
    >
      <span className="text-primary">{score}%</span>{" "}
      <span className={cn("font-sans font-medium text-muted-foreground", size === "lg" ? "text-base" : "text-sm")}>
        compatible
      </span>
    </p>
  );
}

export function CompatibilityReasons({ reasons, max = 4 }: { reasons: string[]; max?: number }) {
  if (reasons.length === 0) return null;
  return (
    <section>
      <h3 className="text-[13px] font-semibold tracking-tight text-primary">Why you might connect</h3>
      <ul className="mt-3 space-y-2">
        {reasons.slice(0, max).map((reason) => (
          <li key={reason} className="flex gap-2.5 text-[14px] leading-relaxed text-muted-foreground">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InterestTags({ hobbies, max = 5 }: { hobbies: PublicHobby[]; max?: number }) {
  if (hobbies.length === 0) return null;
  const shown = hobbies.slice(0, max);
  const rest = hobbies.length - shown.length;
  return (
    <section>
      <h3 className="text-[13px] font-semibold tracking-tight text-primary">Interests</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((hobby) => (
          <span
            key={hobby.name}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium",
              hobby.shared
                ? "border-accent/50 bg-accent/10 text-primary"
                : "border-border/60 text-muted-foreground",
            )}
          >
            {hobby.name}
          </span>
        ))}
        {rest > 0 && (
          <span className="flex items-center px-1 text-xs font-medium text-muted-foreground">
            +{rest} more
          </span>
        )}
      </div>
    </section>
  );
}

export function PersonalitySummary({ traits }: { traits: string[] }) {
  if (traits.length === 0) return null;
  return (
    <section>
      <h3 className="text-[13px] font-semibold tracking-tight text-primary">In their own answers</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{traits.join(" • ")}</p>
    </section>
  );
}

export function ProfileIdentity({
  firstName,
  age,
  city,
  photoUrl,
  large = false,
}: {
  firstName: string;
  age: number | null;
  city: string | null;
  photoUrl: string | null;
  large?: boolean;
}) {
  const initial = (firstName || "K").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-4">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={`${firstName}'s photo`}
          className={cn("shrink-0 rounded-2xl object-cover", large ? "size-20" : "size-16")}
        />
      ) : (
        // Photo-free treatment: Kindred never invents or borrows an image.
        <div
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10",
            large ? "size-20" : "size-16",
          )}
        >
          <span className="font-display text-2xl text-primary">{initial}</span>
        </div>
      )}
      <div className="min-w-0">
        <h2 className={cn("font-display tracking-tight text-primary", large ? "text-3xl" : "text-2xl")}>
          {firstName}
          {age ? <span className="font-sans text-lg font-normal text-muted-foreground">, {age}</span> : null}
        </h2>
        {city && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 text-accent" aria-hidden="true" />
            {city}
          </p>
        )}
      </div>
    </div>
  );
}

export function MatchActions({
  firstName,
  onInterested,
  onPass,
  pending = false,
}: {
  firstName: string;
  onInterested: () => void;
  onPass: () => void;
  pending?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <PrimaryButton
        onClick={onInterested}
        disabled={pending}
        aria-label={`I'd like to meet ${firstName}`}
      >
        I'd like to meet them →
      </PrimaryButton>
      <SecondaryButton onClick={onPass} disabled={pending} aria-label={`Not for me: ${firstName}`}>
        Not for me
      </SecondaryButton>
    </div>
  );
}

export function MatchSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      {[0, 1].map((index) => (
        <div key={index} className="rounded-2xl border border-border/50 bg-background p-6">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-secondary motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-secondary motion-safe:animate-pulse" />
              <div className="h-3 w-20 rounded bg-secondary motion-safe:animate-pulse" />
            </div>
          </div>
          <div className="mt-6 h-6 w-36 rounded bg-secondary motion-safe:animate-pulse" />
          <div className="mt-5 space-y-2.5">
            <div className="h-3 w-full rounded bg-secondary motion-safe:animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-secondary motion-safe:animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-secondary motion-safe:animate-pulse" />
          </div>
          <div className="mt-6 flex gap-2">
            {[0, 1, 2].map((tag) => (
              <div key={tag} className="h-7 w-20 rounded-full bg-secondary motion-safe:animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyMatches({ onReviewPreferences }: { onReviewPreferences: () => void }) {
  return (
    <section className="rounded-2xl border border-border/50 bg-background p-8 text-center">
      <h2 className="font-display text-2xl tracking-tight text-primary">Your circle is still forming.</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        We'll show you new people as Kindred grows.
      </p>
      <div className="mx-auto mt-7 max-w-xs">
        <SecondaryButton onClick={onReviewPreferences}>Review my preferences</SecondaryButton>
      </div>
    </section>
  );
}

export function MatchError({ onRetry }: { onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-2xl border border-border/50 bg-background p-8 text-center">
      <h2 className="font-display text-2xl tracking-tight text-primary">Something went wrong.</h2>
      <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
        We couldn't load your Kindred right now.
      </p>
      <div className="mx-auto mt-7 max-w-xs">
        <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>
      </div>
    </section>
  );
}
