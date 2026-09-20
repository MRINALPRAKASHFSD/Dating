import { MapPin } from "lucide-react";
import type { OnboardingState } from "@/context/onboarding-context";
import { cn } from "@/lib/utils";

export function personalitySummary(answers: Record<number, number>) {
  const opening = ["Thoughtful and grounded", "Warm and people-centered", "Curious and open to discovery", "Adaptable and quietly confident"][answers[0] ?? 0];
  const value = ["emotional connection", "shared interests", "similar values", "growth and ambition"][answers[4] ?? 0];
  const connection = ["feeling truly understood", "sharing experiences", "meaningful conversations", "being completely at ease together"][answers[7] ?? 0];
  return `${opening}, and happiest when connection feels genuine. You value ${value}, ${connection}, and people who are comfortable being themselves.`;
}

export function ProfilePreview({ state, className }: { state: OnboardingState; className?: string }) {
  const { firstName, age, location } = state.basicDetails;
  const initial = (firstName || "Y").charAt(0).toUpperCase();
  
  return (
    <article className={cn("overflow-hidden rounded-3xl border border-border/40 bg-card text-card-foreground shadow-lg shadow-primary/5", className)}>
      <div className="relative border-b border-card-foreground/15 p-7">
        <div className="mb-8 flex size-16 items-center justify-center rounded-2xl bg-accent/20 text-accent ring-1 ring-accent/30 shadow-inner">
          <span className="font-display text-3xl font-bold">{initial}</span>
        </div>
        <h2 className="font-display text-3xl tracking-tight leading-none text-balance">
          {firstName || "Your name"}{age ? <span className="ml-2 font-sans text-2xl font-normal text-card-foreground/70">, {age}</span> : ""}
        </h2>
        {location && (
          <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-card-foreground/70">
            <MapPin className="size-3.5 text-accent" />
            {location}
          </p>
        )}
      </div>
      <div className="p-7 space-y-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent/80">In a few words</p>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-card-foreground/90">
            {personalitySummary(state.personalityAnswers)}
          </p>
        </div>
        
        {state.hobbies.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent/80 mb-3">Interests</p>
            <div className="flex flex-wrap gap-2">
              {state.hobbies.slice(0, 6).map((hobby) => (
                <span 
                  key={hobby} 
                  className="rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-xs font-semibold text-accent"
                >
                  {hobby}
                </span>
              ))}
              {state.hobbies.length > 6 && (
                <span className="flex items-center px-2 text-xs font-bold text-card-foreground/60">
                  +{state.hobbies.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {state.bio && (
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent/80 mb-3">About me</p>
            <p className="text-[14px] italic leading-relaxed text-card-foreground/80">
              "{state.bio}"
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
