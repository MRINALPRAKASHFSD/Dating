import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Kindred — Compatibility before appearances" },
    { name: "description", content: "A calmer dating app built around personality, hobbies, and real compatibility." },
    { property: "og:title", content: "Kindred — Compatibility before appearances" },
    { property: "og:description", content: "Meet people for who they are, not just how they look." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-dvh overflow-hidden bg-background selection:bg-accent/30">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] border-x border-border/10 bg-background shadow-[0_0_50px_-12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2.5 text-primary">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
              <circle cx="15" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="font-display text-2xl font-bold tracking-tight">Kindred</span>
        </div>
        
        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="relative mb-14">
            <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-lg shadow-primary/10">
              <svg className="size-48 text-accent animate-in zoom-in-95 duration-700" viewBox="0 0 160 160" fill="none" aria-label="Two people sharing coffee">
                <path d="M23 103c4-19 15-30 31-30s27 11 31 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M75 103c4-19 15-30 31-30s27 11 31 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M51 61a9 9 0 1 0 0-18 9 9 0 0 0 0 18m58 0a9 9 0 1 0 0-18 9 9 0 0 0 0 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M69 112h22m-17-15h12v8a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-8Zm12 2h4a4 4 0 0 1 0 8h-3m-13-16c-4-5 4-7 0-12m8 12c-4-5 4-7 0-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          
          <div className="animate-in slide-in-from-bottom-6 duration-700 fill-mode-both">
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.2em] text-accent">Dating, with depth.</p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-balance leading-[1.1] tracking-tight text-primary">
              Meet the person, not the profile.
            </h1>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-muted-foreground/90">
              Kindred introduces you through shared interests, personality, and the things that matter. Photos are always optional.
            </p>
          </div>
        </div>
        
        <div className="grid gap-3 animate-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <Button asChild size="lg" className="h-15 rounded-2xl bg-primary text-[17px] font-bold text-primary-foreground shadow-xl shadow-primary/10 hover:bg-primary-hover active:scale-[0.98] transition-all">
            <Link to="/signup">
              Get started <ArrowRight className="ml-1 size-5 stroke-[2.5]" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-15 rounded-2xl border-[2px] border-primary/10 bg-transparent text-[17px] font-bold text-primary">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
