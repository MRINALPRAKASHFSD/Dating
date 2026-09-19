import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { OnboardingShell } from "@/components/kindred/onboarding-shell";
import { PrimaryButton, QuizProgress } from "@/components/kindred/onboarding-ui";
import { QuizCard } from "@/components/kindred/quiz-card";
import { RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding } from "@/context/onboarding-context";
import { savePersonalityAnswers } from "@/lib/kindred-db";

export const Route = createFileRoute("/quiz")({
  head: () => ({ meta: [
    { title: "Personality quiz — Kindred" }, { name: "description", content: "Share how you move through the world." },
    { property: "og:title", content: "Personality quiz — Kindred" }, { property: "og:description", content: "Discover your compatibility through eight thoughtful questions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: () => <RequireAuth><Quiz /></RequireAuth>,
});

const questions = [
  ["How do you usually recharge?", "Quiet time alone", "Spending time with close friends", "Going somewhere new", "A little bit of everything"],
  ["Your ideal Saturday?", "Staying in with a good book or movie", "Meeting friends somewhere", "Exploring somewhere new", "Working on something I'm passionate about"],
  ["When plans suddenly change, you...", "Adapt easily", "Need a little time", "Usually take charge", "Prefer someone else to decide"],
  ["How do you usually handle conflict?", "Talk about it immediately", "Take some time before talking", "Try to find common ground", "Avoid confrontation when possible"],
  ["What matters most in a partner?", "Emotional connection", "Shared interests", "Similar values", "Growth and ambition"],
  ["Your ideal conversation is...", "Deep and philosophical", "Funny and playful", "About shared passions", "A little bit of everything"],
  ["When making an important decision, you rely more on...", "Logic", "Intuition", "Advice from people I trust", "A combination of all three"],
  ["What makes you feel most connected to someone?", "Being understood", "Doing things together", "Having meaningful conversations", "Feeling completely comfortable around them"],
];

function Quiz() {
  const navigate = useNavigate();
  const { state, updateState, persist, saving } = useOnboarding();
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const current = questions[step];
  if (!current) return null;
  const [question, ...options] = current;
  if (!question) return null;
  const selected = state.personalityAnswers[step];
  const select = (index: number) => updateState({ personalityAnswers: { ...state.personalityAnswers, [step]: index } });
  const next = async () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaveError(null);
    const saved = await persist((userId) => savePersonalityAnswers(userId, state.personalityAnswers));
    if (saved) setComplete(true);
    else setSaveError("We couldn't save your answers. Check your connection and try again.");
  };
  const back = () => step > 0 ? setStep(step - 1) : navigate({ to: "/hobbies" });
  if (complete) return <OnboardingShell onBack={() => setComplete(false)} action={<PrimaryButton onClick={() => navigate({ to: "/profile" })}>See my profile →</PrimaryButton>}><div className="animate-step-in pt-12"><p className="mb-3 text-sm text-muted-foreground">Personality complete</p><h1 className="font-display text-5xl leading-tight">That's you, in a nutshell.</h1><p className="mt-5 text-lg leading-relaxed text-muted-foreground">Your answers will shape a profile rooted in how you connect, not how you perform.</p></div></OnboardingShell>;
  return <OnboardingShell onBack={back} aside={saveError ? <p role="alert" className="mb-3 text-center text-[13px] font-medium text-destructive">{saveError}</p> : null} action={<PrimaryButton disabled={selected === undefined || saving} onClick={next}>{saving ? "Saving…" : step === questions.length - 1 ? "Complete quiz →" : "Continue →"}</PrimaryButton>}>
    <QuizProgress current={step + 1} total={questions.length} />
    <div className="mt-7"><QuizCard key={step} question={question} options={options} selected={selected} onSelect={select} /></div>
  </OnboardingShell>;
}