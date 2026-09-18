import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/auth-context";
import { useOnboarding } from "@/context/onboarding-context";
import { PrimaryButton } from "@/components/kindred/onboarding-ui";

/** Calm full-screen placeholder shown while auth or profile data resolves. */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-5 h-px w-24 overflow-hidden bg-border">
          <div className="h-px w-1/2 animate-pulse bg-accent" />
        </div>
        <p className="font-display text-xl tracking-tight text-foreground">Kindred</p>
        <p className="mt-2 text-sm text-muted-foreground">{label}…</p>
      </div>
    </main>
  );
}

/**
 * UI gate for onboarding screens. Real protection lives in the database's
 * row-level security rules — this only keeps signed-out visitors out of the flow.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { loading, loadError, reload } = useOnboarding();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", replace: true });
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return <LoadingScreen label="Checking your session" />;

  if (loadError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl tracking-tight">We couldn't load your profile.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{loadError}</p>
          <div className="mt-8">
            <PrimaryButton onClick={reload}>Try again</PrimaryButton>
          </div>
        </div>
      </main>
    );
  }

  if (loading) return <LoadingScreen label="Loading your profile" />;

  return <>{children}</>;
}
