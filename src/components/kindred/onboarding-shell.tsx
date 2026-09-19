import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";

export function OnboardingShell({ children, step, total, progressLabel, onBack, action, aside }: { children: ReactNode; step?: number; total?: number; progressLabel?: string; onBack: () => void; action: ReactNode; aside?: ReactNode }) {
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <header className="px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex h-11 items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back" className="-ml-2 min-h-11 min-w-11 rounded-full">
              <ArrowLeft className="size-5" />
            </Button>
            <span className="font-display text-xl font-semibold text-primary">Kindred</span>
            <div className="w-9" />
          </div>
          {progressLabel ? <p className="mb-2 text-xs text-muted-foreground">{progressLabel}</p> : null}
          {step && total ? <ProgressBar step={step} total={total} /> : null}
        </header>
        <section className="flex-1 overflow-y-auto px-6 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-7">{children}</section>
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-lg">
            {aside}
            {action}
          </div>
        </footer>
      </div>
    </main>
  );
}