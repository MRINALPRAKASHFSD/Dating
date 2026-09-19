import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FormField, OptionCard, PrimaryButton } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding } from "@/context/onboarding-context";
import { saveBasicDetails } from "@/lib/kindred-db";

export const Route = createFileRoute("/details")({
  head: () => ({ meta: [
    { title: "Basic details — Kindred" }, { name: "description", content: "Share a few essentials for your Kindred profile." },
    { property: "og:title", content: "Basic details — Kindred" }, { property: "og:description", content: "Create a thoughtful, personality-first Kindred profile." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <RequireAuth><BasicDetails /></RequireAuth>,
});

const genderOptions = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const lookingForOptions = ["Women", "Men", "Everyone"];

function BasicDetails() {
  const navigate = useNavigate();
  const { state, updateState, persist, saving } = useOnboarding();
  const [step, setStep] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const details = state.basicDetails;
  
  const setDetails = (updates: Partial<typeof details>) => updateState({ basicDetails: { ...details, ...updates } });
  
  const age = Number(details.age);
  const valid = step === 0 
    ? details.firstName.trim().length > 0 && Number.isInteger(age) && age >= 18 && age <= 100 
    : step === 1 
      ? details.location.trim().length > 0 && Boolean(details.gender) 
      : Boolean(details.lookingFor);
  
  const next = async () => {
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    setSaveError(null);
    const saved = await persist((userId) => saveBasicDetails(userId, details));
    if (saved) navigate({ to: "/preferences" });
    else setSaveError("We couldn't save your details. Check your connection and try again.");
  };
  const back = () => step > 0 ? setStep((current) => current - 1) : navigate({ to: "/" });

  return (
    <OnboardingShell 
      step={step + 1} 
      total={3} 
      progressLabel={`Step ${step + 1} of 3`} 
      onBack={back} 
      aside={saveError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{saveError}</p> : null}
      action={<PrimaryButton disabled={!valid || saving} onClick={next}>{saving ? "Saving…" : "Continue →"}</PrimaryButton>}
    >
      <div key={step} className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">Your profile foundations</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight">Tell us a little about yourself.</h1>
        
        {step === 0 && (
          <div className="mt-10 grid gap-7">
            <FormField 
              id="first-name" 
              label="What's your first name?" 
              autoComplete="given-name" 
              maxLength={60}
              required
              value={details.firstName} 
              onChange={(event) => setDetails({ firstName: event.target.value })} 
              placeholder="Your first name" 
            />
            <FormField 
              id="age" 
              label="How old are you?" 
              type="number" 
              inputMode="numeric" 
              min={18} 
              max={100} 
              required
              value={details.age} 
              onChange={(event) => setDetails({ age: event.target.value })} 
              placeholder="18–100" 
              error={details.age && (!Number.isInteger(age) || age < 18 || age > 100) ? "Enter a whole-number age between 18 and 100." : undefined} 
            />
          </div>
        )}
        
        {step === 1 && (
          <div className="mt-10 grid gap-8">
            <FormField 
              id="location" 
              label="Where do you live?" 
              autoComplete="address-level2" 
              maxLength={80}
              required
              value={details.location} 
              onChange={(event) => setDetails({ location: event.target.value })} 
              placeholder="Your city" 
              hint="We only show your city, never your precise location." 
            />
            <fieldset>
              <legend className="mb-4 text-sm font-bold tracking-tight text-foreground">Gender</legend>
              <div className="grid gap-3">
                {genderOptions.map((option) => (
                  <OptionCard 
                    key={option} 
                    name="gender"
                    value={option}
                    selected={details.gender === option} 
                    onSelect={() => setDetails({ gender: option })}
                  >
                    {option}
                  </OptionCard>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        
        {step === 2 && (
          <fieldset className="mt-10">
            <legend className="mb-4 text-sm font-bold tracking-tight text-foreground">I'm looking for...</legend>
            <div className="grid gap-3">
              {lookingForOptions.map((option) => (
                <OptionCard 
                  key={option} 
                  name="looking-for"
                  value={option}
                  selected={details.lookingFor === option} 
                  onSelect={() => setDetails({ lookingFor: option })}
                >
                  {option}
                </OptionCard>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </OnboardingShell>
  );
}
