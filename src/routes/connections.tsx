import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ConnectionsScreen } from "@/components/kindred/connections-screen";
import { RequireAuth } from "@/components/kindred/require-auth";

export const Route = createFileRoute("/connections")({
  validateSearch: z.object({ match: z.string().uuid().optional() }),
  head: () => ({ meta: [
    { title: "Your connections — Kindred" }, { name: "description", content: "People you both chose to meet, with the reasons you connected." },
    { property: "og:title", content: "Your connections — Kindred" }, { property: "og:description", content: "Mutual connections on Kindred, with shared interests and conversation starters." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { match } = Route.useSearch();
  return (
    <RequireAuth>
      <ConnectionsScreen initialMatchId={match} />
    </RequireAuth>
  );
}
