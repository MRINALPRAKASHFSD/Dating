import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FormField, OptionCard, PrimaryButton } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding } from "@/context/onboarding-context";
import { savePreferences } from "@/lib/kindred-db";
import {
  AGE_PREFERENCE_BOUNDS,
  DISTANCE_PREFERENCE_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  RELATIONSHIP_INTENTS,
  RELATIONSHIP_INTENT_LABEL,
  suggestedAgeRange,
} from "@/lib/matching/config";
import type { RelationshipIntent } from "@/lib/matching/types";

export const Route = createFileRoute("/preferences")({
  head: () => ({ meta: [
    { title: "What you're looking for — Kindred" },
    { name: "description", content: "Tell Kindred what kind of connection feels right for you." },
    { property: "og:title", content: "What you're looking for — Kindred" },
    { property: "og:description", content: "Set the kind of connection, ages and distance that suit you." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <RequireAuth><MatchingPreferences /></RequireAuth>,
});

function MatchingPreferences() {
  const navigate = useNavigate();
  const { state, updateState, persist, saving } = useOnboarding();
  const [saveError, setSaveError] = useState<string | null>(null);

  const ownAge = Number(state.basicDetails.age);
  const suggestion = suggestedAgeRange(Number.isFinite(ownAge) && ownAge > 0 ? ownAge : null);
  const preferences = state.preferences;
  // A saved row wins; a first-time visitor starts from a range around their age.
  const hasSaved = Boolean(preferences.relationshipIntent) || preferences.preferredGenders.length > 0;
  const [ageTouched, setAgeTouched] = useState(false);
  const [distanceTouched, setDistanceTouched] = useState(false);
  const useSuggestion = !hasSaved && !ageTouched;
  const minAge = useSuggestion ? suggestion.minAge : preferences.minAge;
  const maxAge = useSuggestion ? suggestion.maxAge : preferences.maxAge;
  const distanceChosen = hasSaved || distanceTouched;

  const set = (updates: Partial<typeof preferences>) =>
    updateState({ preferences: { ...preferences, minAge, maxAge, ...updates } });

  const agesValid =
    Number.isInteger(minAge) && Number.isInteger(maxAge) &&
    minAge >= AGE_PREFERENCE_BOUNDS.min && maxAge <= AGE_PREFERENCE_BOUNDS.max && minAge <= maxAge;
  const ageError = !agesValid
    ? `Choose a range between ${AGE_PREFERENCE_BOUNDS.min} and ${AGE_PREFERENCE_BOUNDS.max}, with the lower age first.`
    : undefined;

  const distanceSelected = distanceChosen && DISTANCE_PREFERENCE_OPTIONS.some(
    (option) => option.value === preferences.maxDistanceKm,
  );
  const valid =
    Boolean(preferences.relationshipIntent) &&
    preferences.preferredGenders.length > 0 &&
    agesValid &&
    distanceSelected;

  const onContinue = async () => {
    setSaveError(null);
    const next = { ...preferences, minAge, maxAge };
    updateState({ preferences: next });
    const saved = await persist((userId) => savePreferences(userId, next));
    if (saved) navigate({ to: "/hobbies" });
    else setSaveError("We couldn't save your preferences. Check your connection and try again.");
  };

  return (
    <OnboardingShell
      onBack={() => navigate({ to: "/details" })}
      aside={saveError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{saveError}</p> : null}
      action={<PrimaryButton disabled={!valid || saving} onClick={onContinue}>{saving ? "Saving…" : "Continue →"}</PrimaryButton>}
    >
      <div className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">Your matching preferences</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight">What are you looking for?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground/90">
          Tell us what kind of connection feels right for you. You can always change this later.
        </p>

        <fieldset className="mt-10">
          <legend className="mb-4 text-sm font-bold tracking-tight text-foreground">What brings you to Kindred?</legend>
          <div className="grid gap-3">
            {RELATIONSHIP_INTENTS.map((intent: RelationshipIntent) => (
              <OptionCard
                key={intent}
                name="relationship-intent"
                value={intent}
                selected={preferences.relationshipIntent === intent}
                onSelect={() => set({ relationshipIntent: intent })}
              >
                {RELATIONSHIP_INTENT_LABEL[intent]}
              </OptionCard>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-10">
          <legend className="mb-4 text-sm font-bold tracking-tight text-foreground">I'm interested in meeting...</legend>
          <div className="grid gap-3">
            {GENDER_PREFERENCE_OPTIONS.map((option) => (
              <OptionCard
                key={option}
                name="preferred-genders"
                value={option}
                selected={preferences.preferredGenders[0] === option}
                onSelect={() => set({ preferredGenders: [option] })}
              >
                {option}
              </OptionCard>
            ))}
          </div>
        </fieldset>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-bold tracking-tight text-foreground">I'd like to meet people between...</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="min-age"
              label="Minimum age"
              type="number"
              inputMode="numeric"
              min={AGE_PREFERENCE_BOUNDS.min}
              max={AGE_PREFERENCE_BOUNDS.max}
              value={String(minAge)}
              onChange={(event) => { setAgeTouched(true); set({ minAge: Number(event.target.value) }); }}
            />
            <FormField
              id="max-age"
              label="Maximum age"
              type="number"
              inputMode="numeric"
              min={AGE_PREFERENCE_BOUNDS.min}
              max={AGE_PREFERENCE_BOUNDS.max}
              value={String(maxAge)}
              onChange={(event) => { setAgeTouched(true); set({ maxAge: Number(event.target.value) }); }}
            />
          </div>
          {ageError ? (
            <p role="alert" className="mt-2 text-xs font-medium leading-relaxed text-destructive">{ageError}</p>
          ) : (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">You can widen or narrow this at any time.</p>
          )}
        </section>

        <fieldset className="mt-10">
          <legend className="mb-4 text-sm font-bold tracking-tight text-foreground">How far are you comfortable meeting someone?</legend>
          <div className="grid gap-3">
            {DISTANCE_PREFERENCE_OPTIONS.map((option) => (
              <OptionCard
                key={option.label}
                name="max-distance"
                value={option.label}
                selected={distanceChosen && preferences.maxDistanceKm === option.value}
                onSelect={() => { setDistanceTouched(true); set({ maxDistanceKm: option.value }); }}
              >
                {option.label}
              </OptionCard>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">We only ever use your city — never your precise location.</p>
        </fieldset>
      </div>
    </OnboardingShell>
  );
}
