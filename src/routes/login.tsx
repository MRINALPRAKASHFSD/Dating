import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, PrimaryButton } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { friendlyAuthError, useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Log in — Kindred" }, { name: "description", content: "Log back in to your Kindred profile." },
    { property: "og:title", content: "Log in — Kindred" }, { property: "og:description", content: "Continue where you left off on Kindred." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/continue", replace: true });
  }, [loading, user, navigate]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length > 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate({ to: "/continue", replace: true });
    } catch (caught) {
      setError(friendlyAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      onBack={() => navigate({ to: "/" })}
      aside={error ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{error}</p> : null}
      action={<PrimaryButton disabled={!valid || busy} onClick={submit}>{busy ? "Logging in…" : "Log in →"}</PrimaryButton>}
    >
      <form
        className="animate-step-in"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !busy) void submit();
        }}
      >
        <p className="mb-2 text-[13px] font-medium text-accent">Welcome back</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight text-foreground">Good to see you again.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground/90">Log in to pick up right where you left off.</p>

        <div className="mt-10 grid gap-6">
          <FormField
            id="login-email"
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
          <FormField
            id="login-password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            action={
              <Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-lg" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            }
          />
        </div>

        <p className="mt-6 text-center text-[13px] font-medium text-muted-foreground">
          <Link to="/reset-password" className="text-primary underline underline-offset-4">Forgot your password?</Link>
        </p>
        <p className="mx-auto mt-3 text-center text-[13px] font-semibold text-muted-foreground">
          New to Kindred? <Link to="/signup" className="text-primary underline underline-offset-4">Create an account</Link>
        </p>
      </form>
    </OnboardingShell>
  );
}
