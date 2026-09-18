import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FormField, PrimaryButton } from "@/components/kindred/onboarding-ui";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { friendlyAuthError, useAuth } from "@/context/auth-context";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset your password — Kindred" }, { name: "description", content: "Set a new password for your Kindred account." },
    { property: "og:title", content: "Reset your password — Kindred" }, { property: "og:description", content: "Recover access to your Kindred profile." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { user, requestPasswordReset, updatePassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Arriving from the recovery email signs the member in temporarily, so we
  // can ask straight away for a new password.
  const recovering = Boolean(user);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (recovering) {
        await updatePassword(password);
        navigate({ to: "/continue", replace: true });
      } else {
        await requestPasswordReset(email.trim());
        setSent(true);
      }
    } catch (caught) {
      setError(friendlyAuthError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <OnboardingShell onBack={() => setSent(false)} action={<PrimaryButton onClick={() => navigate({ to: "/login" })}>Back to log in</PrimaryButton>}>
        <div className="animate-step-in pt-12">
          <p className="mb-3 text-[13px] font-medium text-accent">Check your inbox</p>
          <h1 className="font-display text-4xl leading-tight text-balance">We've sent you a reset link.</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Open the email we just sent to {email} and follow the link to choose a new password.
          </p>
        </div>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell
      onBack={() => navigate({ to: "/login" })}
      aside={error ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{error}</p> : null}
      action={
        <PrimaryButton disabled={busy || (recovering ? !passwordValid : !emailValid)} onClick={submit}>
          {busy ? "Working…" : recovering ? "Save new password →" : "Send reset link →"}
        </PrimaryButton>
      }
    >
      <div className="animate-step-in">
        <p className="mb-2 text-[13px] font-medium text-accent">Account recovery</p>
        <h1 className="font-display text-3xl md:text-4xl text-balance leading-tight">
          {recovering ? "Choose a new password." : "Let's get you back in."}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground/90">
          {recovering
            ? "Pick something you'll remember — at least 8 characters with a letter and a number."
            : "Enter your email address and we'll send you a link to reset your password."}
        </p>

        <div className="mt-10 grid gap-6">
          {recovering ? (
            <FormField
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a new password"
              hint="Use at least 8 characters, including a letter and number."
            />
          ) : (
            <FormField
              id="reset-email"
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
          )}
        </div>

        <p className="mx-auto mt-8 text-center text-[13px] font-semibold text-muted-foreground">
          Remembered it? <Link to="/login" className="text-primary underline underline-offset-4">Log in</Link>
        </p>
      </div>
    </OnboardingShell>
  );
}
