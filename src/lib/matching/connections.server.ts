/**
 * Server-only connection data access.
 *
 * Every function takes the caller's id from the verified session (never from
 * client input). Matches are created here and nowhere else: the browser can
 * only say "I am interested in profile X", and the server decides whether a
 * reciprocal interest exists.
 */
import { calculateCompatibility, toPublicMatch } from "./engine";
import { loadCandidates } from "./matching.server";
import { normalisePair, toPublicConnection } from "./connections";
import type { ConnectionStatus, PublicConnection } from "./connections";

type MatchRow = {
  id: string;
  profile_a_id: string;
  profile_b_id: string;
  status: string;
  a_seen_at: string | null;
  b_seen_at: string | null;
  created_at: string;
};

/**
 * Creates the connection if — and only if — the other member already recorded
 * an active interest in the caller. Returns the match id when a connection is
 * active (existing or newly created), otherwise null.
 */
export async function createMatchIfMutual(
  userId: string,
  otherProfileId: string,
): Promise<string | null> {
  if (userId === otherProfileId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: outgoing }, { data: reciprocal }] = await Promise.all([
    supabaseAdmin
      .from("profile_interests")
      .select("status")
      .eq("from_profile_id", userId)
      .eq("to_profile_id", otherProfileId)
      .maybeSingle(),
    supabaseAdmin
      .from("profile_interests")
      .select("status")
      .eq("from_profile_id", otherProfileId)
      .eq("to_profile_id", userId)
      .maybeSingle(),
  ]);

  if (outgoing?.status !== "interested" || reciprocal?.status !== "interested") return null;

  const pair = normalisePair(userId, otherProfileId);

  const { data: existing } = await supabaseAdmin
    .from("matches")
    .select("id, status")
    .eq("profile_a_id", pair.profileAId)
    .eq("profile_b_id", pair.profileBId)
    .maybeSingle();

  // A pair can only ever have one row; an ended connection is not resurrected.
  if (existing) return existing.status === "active" ? existing.id : null;

  const { data: created, error } = await supabaseAdmin
    .from("matches")
    .insert({ profile_a_id: pair.profileAId, profile_b_id: pair.profileBId })
    .select("id")
    .single();
  if (error) {
    // Unique violation: the other side created it at the same moment.
    if (error.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("matches")
        .select("id")
        .eq("profile_a_id", pair.profileAId)
        .eq("profile_b_id", pair.profileBId)
        .maybeSingle();
      return raced?.id ?? null;
    }
    throw error;
  }
  return created.id;
}

/** Active connections for a member, with compatibility recomputed by the engine. */
export async function getConnectionsFor(userId: string): Promise<PublicConnection[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: matches, error } = await supabaseAdmin
    .from("matches")
    .select("id, profile_a_id, profile_b_id, status, a_seen_at, b_seen_at, created_at")
    .or(`profile_a_id.eq.${userId},profile_b_id.eq.${userId}`)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (matches ?? []) as MatchRow[];
  if (rows.length === 0) return [];

  const partnerIds = rows.map((row) =>
    row.profile_a_id === userId ? row.profile_b_id : row.profile_a_id,
  );
  const candidates = await loadCandidates([userId, ...partnerIds]);
  const byId = new Map(candidates.map((candidate) => [candidate.profileId, candidate]));
  const viewer = byId.get(userId);
  if (!viewer) return [];

  const connections: PublicConnection[] = [];
  for (const row of rows) {
    const partnerId = row.profile_a_id === userId ? row.profile_b_id : row.profile_a_id;
    const partner = byId.get(partnerId);
    if (!partner) continue;
    const result = calculateCompatibility(viewer, partner);
    const seenAt = row.profile_a_id === userId ? row.a_seen_at : row.b_seen_at;
    connections.push(
      toPublicConnection(toPublicMatch(partner, result, viewer.hobbies), {
        matchId: row.id,
        matchedAt: row.created_at,
        status: row.status as ConnectionStatus,
        isNew: seenAt == null,
      }),
    );
  }
  return connections;
}

/** Outgoing interests that have not (yet) become a connection. */
export async function getPendingInterestsFor(userId: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profile_interests")
    .select("to_profile_id")
    .eq("from_profile_id", userId)
    .eq("status", "interested");
  if (error) throw error;
  return (data ?? []).map((row) => row.to_profile_id);
}
