import { createFileRoute } from "@tanstack/react-router";
import { MatchDiscovery } from "@/components/kindred/match-discovery";
import { RequireAuth } from "@/components/kindred/require-auth";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [
    { title: "Your Kindred" }, { name: "description", content: "People whose interests, personality and intentions align with yours." },
    { property: "og:title", content: "Your Kindred" }, { property: "og:description", content: "Compatibility-first discovery: understand why someone appears before you decide." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => (
    <RequireAuth>
      <MatchDiscovery />
    </RequireAuth>
  ),
});
