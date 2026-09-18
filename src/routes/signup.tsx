import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, PrimaryButton, SecondaryButton } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { friendlyAuthError, useAuth } from "@/context/auth-context";
import { useOnboarding } from "@/context/onboarding-context";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [
    { title: "Create your profile — Kindred" }, { name: "description", content: "Tell Kindred a little about yourself." },
    { property: "og:title", content: "Create your profile — Kindred" }, { property: "og:description", content: "Start a compatibility-first dating profile." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { state, updateState } = useOnboarding();
  const { user, loading, signUp } = useAuth();
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const account = state.account;

  useEffect(() => {
    if (!loading && user && !verificationSent) navigate({ to: "/continue", replace: true });
  }, [loading, user, verificationSent, navigate]);

  const setAccount = (updates: Partial<typeof account>) => updateState({ account: { ...account, ...updates } });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email);
  const passwordValid = account.password.length >= 8 && /[A-Za-z]/.test(account.password) && /\d/.test(account.password);
  const confirmValid = account.confirmPassword.length > 0 && account.confirmPassword === account.password;
  const valid = emailValid && passwordValid && confirmValid;

  const createAccount = async () => {
    setBusy(true);
    setFormError(null);
    try {
      const { needsVerification } = await signUp(account.email.trim(), account.password);
      updateState({ account: { ...account, password: "", confirmPassword: "" } });
      if (needsVerification) setVerificationSent(true);
      else navigate({ to: "/continue", replace: true });
    } catch (caught) {
      setFormError(friendlyAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (verificationSent) {
    return (
      <OnboardingShell onBack={() => setVerificationSent(false)} action={<PrimaryButton onClick={() => navigate({ to: "/login" })}>Go to log in</PrimaryButton>}>
        <div className="animate-step-in pt-12">
          <p className="mb-3 text-[13px] font-medium text-accent">One quick step</p>
          <h1 className="font-display text-4xl leading-tight text-balance">Confirm your email address.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            We've sent a confirmation link to {account.email}. Open it, then log in to continue building your profile.
          </p>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      onBack={() => navigate({ to: "/" })}
      aside={formError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{formError}</p> : null}
      action={<PrimaryButton disabled={!valid || busy} onClick={createAccount}>{busy ? "Creating account…" : "Create account →"}</PrimaryButton>}
    >
      <div className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">A more meaningful beginning</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight text-foreground">Let's get to know you.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground/90">Kindred starts with what makes you you — not how you look.</p>

        <div className="mt-10 grid gap-6">
          <FormField
            id="email"
            label="Email address"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
            value={account.email}
            onBlur={() => setTouched((current) => ({ ...current, email: true }))}
            onChange={(event) => setAccount({ email: event.target.value })}
            placeholder="you@example.com"
            error={touched.email && !emailValid ? "Enter a valid email address." : undefined}
          />
          <FormField
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={account.password}
            onBlur={() => setTouched((current) => ({ ...current, password: true }))}
            onChange={(event) => setAccount({ password: event.target.value })}
            placeholder="Create a password"
            hint={!touched.password ? "Use at least 8 characters, including a letter and number." : undefined}
            error={touched.password && !passwordValid ? "Use at least 8 characters, including a letter and number." : undefined}
            action={<Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-lg" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button>}
          />
          <FormField
            id="confirm-password"
            label="Confirm password"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            maxLength={128}
            required
            value={account.confirmPassword}
            onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
            onChange={(event) => setAccount({ confirmPassword: event.target.value })}
            placeholder="Repeat your password"
            error={touched.confirmPassword && !confirmValid ? "Passwords must match." : undefined}
            action={<Button type="button" variant="ghost" size="icon" className="min-h-11 min-w-11 rounded-lg" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? "Hide confirmed password" : "Show confirmed password"}>{showConfirmation ? <EyeOff /> : <Eye />}</Button>}
          />
        </div>

        <div className="my-10 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
          <span className="h-px flex-1 bg-border/40" />
          <span>or</span>
          <span className="h-px flex-1 bg-border/40" />
        </div>

        <SecondaryButton type="button" disabled aria-describedby="google-availability">Continue with Google</SecondaryButton>
        <p id="google-availability" className="mt-2 text-center text-xs text-muted-foreground">Google sign-in will be available soon.</p>

        <p className="mx-auto mt-6 text-center text-[13px] font-semibold text-muted-foreground">
          Already have an account? <Link to="/login" className="text-primary underline underline-offset-4">Log in</Link>
        </p>
      </div>
    </OnboardingShell>
  );
}
