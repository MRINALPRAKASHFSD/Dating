import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicConnection } from "@/lib/matching/connections";

/** Mutual connections for the authenticated member. */
export const getConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PublicConnection[]> => {
    const { getConnectionsFor } = await import("@/lib/matching/connections.server");
    return getConnectionsFor(context.userId);
  });

/** Profile ids the member has expressed interest in and is waiting on. */
export const getPendingInterests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { getPendingInterestsFor } = await import("@/lib/matching/connections.server");
    return getPendingInterestsFor(context.userId);
  });

/**
 * Ends a connection. The update runs through the caller's own session, so
 * row-level security guarantees only a participant can unmatch, and the
 * historical row is kept (status becomes "unmatched", never deleted).
 */
export const unmatchConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ matchId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { error, data: updated } = await context.supabase
      .from("matches")
      .update({ status: "unmatched" })
      .eq("id", data.matchId)
      .select("id");
    if (error) throw error;
    if (!updated || updated.length === 0) {
      throw new Error("We couldn't end that connection.");
    }
    return { ok: true };
  });

/** Clears the "new connection" state for the caller's side of a match. */
export const markConnectionSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ matchId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const { data: row, error: readError } = await context.supabase
      .from("matches")
      .select("id, profile_a_id")
      .eq("id", data.matchId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row) return { ok: true };

    const seenAt = new Date().toISOString();
    const patch =
      row.profile_a_id === context.userId ? { a_seen_at: seenAt } : { b_seen_at: seenAt };
    const { error } = await context.supabase
      .from("matches")
      .update(patch)
      .eq("id", data.matchId);
    if (error) throw error;
    return { ok: true };
  });
