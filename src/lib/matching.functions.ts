import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicMatch } from "@/lib/matching/types";

/**
 * Returns ranked, explainable matches for the authenticated member.
 * Ownership always comes from the verified session, never from client input.
 */
export const getCompatibleMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(50).optional(),
        offset: z.number().int().min(0).max(500).optional(),
      })
      .default({})
      .parse(data ?? {}),
  )
  .handler(async ({ context, data }): Promise<PublicMatch[]> => {
    const { getCompatibleMatchesFor } = await import("@/lib/matching/matching.server");
    return getCompatibleMatchesFor(context.userId, data.limit ?? 10, data.offset ?? 0);
  });

/**
 * Records an outgoing decision about a candidate ("interested" / "passed" /
 * "withdrawn"). The row is written through the caller's own Supabase session,
 * so row-level security decides ownership; the client cannot supply a sender.
 * Expressing interest never creates a match on its own — a mutual connection
 * only exists once both sides have recorded interest.
 */
export const recordInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        toProfileId: z.string().uuid(),
        status: z.enum(["interested", "passed", "withdrawn"]),
      })
      .parse(data),
  )
  .handler(
    async ({ context, data }): Promise<{ ok: true; mutual: boolean; matchId: string | null }> => {
      if (data.toProfileId === context.userId) {
        throw new Error("You can't express interest in yourself.");
      }

      const { error } = await context.supabase.from("profile_interests").upsert(
        {
          from_profile_id: context.userId,
          to_profile_id: data.toProfileId,
          status: data.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "from_profile_id,to_profile_id" },
      );
      if (error) throw error;

      // The server — never the browser — decides whether a connection exists.
      let matchId: string | null = null;
      if (data.status === "interested") {
        const { createMatchIfMutual } = await import("@/lib/matching/connections.server");
        matchId = await createMatchIfMutual(context.userId, data.toProfileId);
      }

      return { ok: true, mutual: matchId != null, matchId };
    },
  );

