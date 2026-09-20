import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LoadingScreen, RequireAuth } from "@/components/kindred/require-auth";
import { useOnboarding } from "@/context/onboarding-context";

export const Route = createFileRoute("/continue")({
  head: () => ({ meta: [
    { title: "Continue — Kindred" }, { name: "description", content: "Pick up your Kindred profile where you left off." },
    { property: "og:title", content: "Continue — Kindred" }, { property: "og:description", content: "Resume your Kindred onboarding." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => (
    <RequireAuth>
      <ContinueOnboarding />
    </RequireAuth>
  ),
});

function ContinueOnboarding() {
  const navigate = useNavigate();
  const { resumePath } = useOnboarding();

  useEffect(() => {
    navigate({ to: resumePath, replace: true });
  }, [resumePath, navigate]);

  return <LoadingScreen label="Picking up where you left off" />;
}
