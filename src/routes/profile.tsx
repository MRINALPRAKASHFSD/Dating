import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Check, Heart } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { PrimaryButton, SecondaryButton } from "@/components/kindred/onboarding-ui";
import { ProfilePreview } from "@/components/kindred/profile-preview";
import { RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding } from "@/context/onboarding-context";
import { completeOnboarding } from "@/lib/kindred-db";
import { cn } from "@/lib/utils";
import { KindredHeader } from "@/components/kindred/kindred-header";
import { KindredNav } from "@/components/kindred/connection-ui";
import { BlockedMembersSettings } from "@/components/kindred/safety-dialogs";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Your profile preview — Kindred" }, { name: "description", content: "Preview how your Kindred profile will appear." },
    { property: "og:title", content: "Your profile preview — Kindred" }, { property: "og:description", content: "A personality-first profile built around real interests." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <RequireAuth><Profile /></RequireAuth>,
});

function Profile() {
  const navigate = useNavigate();
  const { state, updateState, persist, saving } = useOnboarding();
  const [complete, setComplete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "privacy">("profile");
  const fileInput = useRef<HTMLInputElement>(null);

  const finish = async () => {
    setSaveError(null);
    const saved = await persist((userId) => completeOnboarding(userId, state.bio));
    if (saved) {
      updateState({ onboardingCompleted: true });
      setComplete(true);
    } else {
      setSaveError("We couldn't save your profile. Nothing is lost — please try again.");
    }
  };

  if (complete) {
    return (
      <OnboardingShell 
        onBack={() => setComplete(false)} 
        action={<PrimaryButton onClick={() => navigate({ to: "/home" })}>Finish onboarding</PrimaryButton>}
      >
        <div className="animate-step-in pt-12 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-8 flex size-16 items-center justify-center rounded-[20px] bg-accent/20 text-accent ring-1 ring-accent/30 shadow-lg shadow-accent/5">
            <Check className="size-7 stroke-[3]" />
          </div>
          <p className="mb-3 text-[13px] font-bold uppercase tracking-[0.2em] text-accent">Phase 1 complete</p>
          <h1 className="font-display text-4xl md:text-5xl text-balance leading-tight">Your profile is ready.</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-sm mx-auto sm:mx-0">
            Kindred has what it needs to introduce you through compatibility when matching arrives.
          </p>
        </div>
      </OnboardingShell>
    );
  }

  if (state.onboardingCompleted && !complete) {
    return (
      <main className="min-h-dvh bg-background">
        <div className="mx-auto w-full max-w-lg border-x border-border/10 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-3xl">
          <KindredHeader />
          <KindredNav />

          <div className="mt-8 flex gap-2 border-b border-border/60 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors",
                activeTab === "profile"
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              Your Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors",
                activeTab === "privacy"
                  ? "bg-accent/15 font-semibold text-accent"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              Privacy & Safety
            </button>
          </div>

          <div className="mt-6">
            {activeTab === "profile" ? (
              <div className="space-y-6">
                <div>
                  <h1 className="font-display text-3xl tracking-tight text-primary">
                    Your profile
                  </h1>
                  <p className="mt-1 text-[15px] text-muted-foreground">
                    This is how other members see you across Kindred.
                  </p>
                </div>
                <ProfilePreview state={state} />
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/details" })}
                    className="h-11 rounded-xl text-[14px] font-medium"
                  >
                    Edit profile details
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-2">
                <BlockedMembersSettings />
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <OnboardingShell 
      onBack={() => navigate({ to: "/quiz" })} 
      aside={
        <>
          {saveError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{saveError}</p> : null}
          <Button 
            variant="ghost" 
            className="mb-2 h-11 w-full text-[13px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:bg-transparent hover:text-primary transition-colors" 
            onClick={() => navigate({ to: "/details" })}
          >
            Edit profile details
          </Button>
        </>
      } 
      action={
        <PrimaryButton onClick={finish} disabled={saving} className="gap-2">
          {saving ? "Saving…" : <>Looks good — find my matches <Heart className="size-4 fill-current" /></>}
        </PrimaryButton>
      }
    >
      <div className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">This is how others will meet you</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight">Meet the person behind the profile.</h1>
        
        <div className="mt-8">
          <ProfilePreview state={state} />
        </div>
        
        <div className="mt-10">
          <label htmlFor="bio" className="block text-sm font-bold tracking-tight text-foreground">
            Add a bio <span className="font-normal text-muted-foreground/60 ml-1.5">(optional)</span>
          </label>
          <Textarea 
            id="bio" 
             aria-describedby="bio-count"
            maxLength={300} 
            value={state.bio} 
            onChange={(event) => updateState({ bio: event.target.value })} 
            placeholder="Tell someone something they wouldn't learn from your interests..." 
            className="mt-3 min-h-[120px] rounded-2xl border-border/60 bg-transparent p-5 text-[15px] leading-relaxed shadow-none transition-colors focus:border-accent focus-visible:ring-accent resize-none" 
          />
          <div className="mt-2.5 flex justify-end">
            <span id="bio-count" aria-live="polite" className={cn(
              "text-[10px] font-bold tabular-nums tracking-widest px-2 py-0.5 rounded-full",
              state.bio.length > 280 ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground/70"
            )}>
              {state.bio.length} / 300
            </span>
          </div>
        </div>

        <section className="mt-10 border-t border-border/40 pt-10">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Camera className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Profile photo</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground/80">
                Photos are optional on Kindred. You can add one now or skip it.
              </p>
            </div>
          </div>
          
          <input 
            ref={fileInput} 
            className="sr-only" 
            type="file" 
            accept="image/*" 
            aria-label="Choose an optional profile photo" 
            onChange={(event) => updateState({ photo: event.target.files?.[0]?.name ?? null })} 
          />
          
          <div className="mt-6 flex flex-col gap-2">
            <SecondaryButton 
              type="button" 
              className={cn(state.photo && "border-accent text-accent bg-accent/5")}
              onClick={() => fileInput.current?.click()}
            >
              {state.photo ? "Change photo" : "Add a photo"}
            </SecondaryButton>
            
            {state.photo ? (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-11 w-full text-xs font-bold uppercase tracking-wider text-destructive/70 hover:bg-destructive/5 hover:text-destructive transition-colors" 
                onClick={() => updateState({ photo: null })}
              >
                Remove photo
              </Button>
            ) : (
              <Button 
                type="button" 
                variant="ghost" 
                className="h-11 w-full text-xs font-bold uppercase tracking-wider text-muted-foreground/60 hover:bg-transparent hover:text-primary transition-colors" 
                onClick={finish}
              >
                Skip for now
              </Button>
            )}
          </div>
          
          {state.photo && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary/50 p-3">
              <Check className="size-3.5 text-accent" />
              <p className="truncate text-[11px] font-bold text-muted-foreground/80">
                Selected: {state.photo}
              </p>
            </div>
          )}
        </section>
      </div>
    </OnboardingShell>
  );
}
