import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategorySection, PrimaryButton, SearchInput } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { TagPill } from "@/components/kindred/tag-pill";
import { RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding, type HobbyIntensity } from "@/context/onboarding-context";
import { saveHobbies } from "@/lib/kindred-db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hobbies")({
  head: () => ({ meta: [
    { title: "Your interests — Kindred" }, { name: "description", content: "Choose the hobbies and skills that make you, you." },
    { property: "og:title", content: "Your interests — Kindred" }, { property: "og:description", content: "Build your Kindred profile around what you love." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <RequireAuth><Hobbies /></RequireAuth>,
});

const categories = {
  Music: ["Singing", "Guitar", "Piano", "Concerts", "Classical", "Hip-hop", "Indie", "Electronic"],
  Sports: ["Football", "Cricket", "Basketball", "Tennis", "Badminton", "Running", "Gym", "Cycling"],
  Technology: ["Programming", "AI", "Startups", "Robotics", "Gaming", "Web Development", "Cybersecurity"],
  Arts: ["Photography", "Painting", "Drawing", "Design", "Writing", "Film Making"],
  Food: ["Cooking", "Baking", "Cafés", "Street Food", "Fine Dining"],
  Outdoors: ["Hiking", "Trekking", "Camping", "Travel", "Nature"],
  Books: ["Fiction", "Non-fiction", "Psychology", "Philosophy", "Business", "Self-help"],
  Film: ["Cinema", "Documentaries", "Sci-fi", "Comedy", "Drama", "Thrillers"],
  Wellness: ["Meditation", "Yoga", "Fitness", "Mental Wellness", "Journaling"],
  Gaming: ["PC Gaming", "Console", "Mobile Gaming", "Esports", "Board Games"],
};

const intensityLevels: HobbyIntensity[] = ["Casual", "Regular", "Passionate"];

function Hobbies() {
  const navigate = useNavigate();
  const { state, updateState, persist, saving } = useOnboarding();
  const [open, setOpen] = useState<string[]>(["Music"]);
  const [search, setSearch] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const goNext = async () => {
    setSaveError(null);
    const saved = await persist((userId) => saveHobbies(userId, state.hobbies, state.hobbyIntensity));
    if (saved) navigate({ to: "/quiz" });
    else setSaveError("We couldn't save your interests. Check your connection and try again.");
  };
  
  const toggle = (tag: string) => {
    if (state.hobbies.includes(tag)) {
      const hobbyIntensity = { ...state.hobbyIntensity };
      delete hobbyIntensity[tag];
      updateState({ hobbies: state.hobbies.filter((item) => item !== tag), hobbyIntensity });
    } else {
      updateState({ 
        hobbies: [...state.hobbies, tag], 
        hobbyIntensity: { ...state.hobbyIntensity, [tag]: "Regular" } 
      });
    }
  };

  const query = search.trim().toLowerCase();
  
  return (
    <OnboardingShell 
      onBack={() => navigate({ to: "/preferences" })} 
      aside={
        <>
        {saveError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{saveError}</p> : null}
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-sm font-medium text-muted-foreground" aria-live="polite">
            {state.hobbies.length} selected
            {state.hobbies.length < 5 && <span className="text-xs font-normal ml-1.5 opacity-70">• Choose {5 - state.hobbies.length} more</span>}
          </p>
          {state.hobbies.length > 0 && (
            <Button
              type="button" 
              variant="ghost"
              onClick={() => updateState({ hobbies: [], hobbyIntensity: {} })}
              className="min-h-11 px-2 text-xs font-semibold text-primary/70 hover:bg-transparent hover:text-primary"
            >
              Clear all
            </Button>
          )}
        </div>
        </>
      } 
      action={<PrimaryButton disabled={state.hobbies.length < 5 || saving} onClick={goNext}>{saving ? "Saving…" : "Continue →"}</PrimaryButton>}
    >
      <div className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">The things that light you up</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight">What are you into?</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground/90">Choose the things you'd genuinely enjoy sharing with someone.</p>
        
        <div className="sticky top-0 z-10 mt-7 bg-background pb-4 pt-1">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        {state.hobbies.length > 0 && (
          <section className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="mb-4 text-sm font-bold tracking-tight">How much are you into them?</h2>
            <div className="grid gap-5">
              {state.hobbies.map((hobby) => (
                <fieldset key={hobby} className="grid gap-2.5">
                  <legend className="text-[13px] font-semibold leading-none">{hobby}</legend>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1" role="radiogroup">
                    {intensityLevels.map((level) => (
                      <Button 
                        key={level} 
                        size="sm" 
                        variant="ghost" 
                        role="radio"
                        aria-checked={state.hobbyIntensity[hobby] === level}
                        aria-label={`${level} interest in ${hobby}`}
                        onClick={() => updateState({ hobbyIntensity: { ...state.hobbyIntensity, [hobby]: level } })} 
                        className={cn(
                          "min-h-11 rounded-lg px-1 text-xs font-semibold transition-colors shadow-none",
                          state.hobbyIntensity[hobby] === level 
                            ? "bg-background text-primary shadow-sm" 
                            : "text-muted-foreground hover:bg-transparent hover:text-primary"
                        )}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 divide-y divide-border/40">
          {Object.entries(categories).map(([category, tags]) => {
            const matches = tags.filter((tag) => tag.toLowerCase().includes(query));
            const expanded = query.length > 0 || open.includes(category);
            return (
              <CategorySection 
                key={category} 
                title={category} 
                open={expanded} 
                hidden={matches.length === 0} 
                onToggle={() => setOpen(expanded && !query ? open.filter((item) => item !== category) : [...open, category])}
              >
                {matches.map((tag) => (
                  <TagPill 
                    key={tag} 
                    label={tag} 
                    selected={state.hobbies.includes(tag)} 
                    onToggle={() => toggle(tag)} 
                  />
                ))}
              </CategorySection>
            );
          })}
        </div>
        {query && !Object.values(categories).flat().some((tag) => tag.toLowerCase().includes(query)) && (
          <p className="py-20 text-center text-[15px] text-muted-foreground italic">No hobbies match “{search}”.</p>
        )}
      </div>
    </OnboardingShell>
  );
}
