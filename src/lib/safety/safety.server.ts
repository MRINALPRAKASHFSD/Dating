/**
 * Server-only safety, blocking, and reporting data access.
 *
 * Every function takes the caller's id from the verified session (never from
 * client input). Enforces strict server-side authorization and confidentiality.
 */

import type {
  BlockedMemberSummary,
  BlockResult,
  ReportResult,
  ReportSubmission,
  UnblockResult,
} from "./types";
import { validateBlockTarget, validateReportSubmission } from "./safety";

// ── Blocks ──────────────────────────────────────────────────────────────

/**
 * Blocks a target profile. Only the authenticated caller can create a block
 * where they are the blocker. Idempotent on duplicate attempts.
 */
export async function blockUser(
  userId: string,
  targetUserId: string,
): Promise<BlockResult> {
  const validation = validateBlockTarget(userId, targetUserId);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verify target profile exists.
  const { data: targetProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .single();

  if (profileError || !targetProfile) {
    throw new Error("Target user not found.");
  }

  const { error } = await supabaseAdmin.from("user_blocks").insert({
    blocker_id: userId,
    blocked_id: targetUserId,
  });

  if (error) {
    // Unique violation (23505): block already exists, treated as idempotent success.
    if (error.code === "23505") {
      return { success: true, blockedId: targetUserId, alreadyBlocked: true };
    }
    throw error;
  }

  return { success: true, blockedId: targetUserId };
}

/**
 * Removes a block previously created by the caller.
 * Users can only delete blocks they created.
 */
export async function unblockUser(
  userId: string,
  targetUserId: string,
): Promise<UnblockResult> {
  if (!userId || !targetUserId) {
    throw new Error("User IDs are required.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { error } = await supabaseAdmin
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", targetUserId);

  if (error) throw error;

  return { success: true, unblockedId: targetUserId };
}

/**
 * Lists all members that the authenticated caller has currently blocked.
 * Used for the privacy settings screen.
 */
export async function getBlockedUsers(
  userId: string,
): Promise<BlockedMemberSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: blocks, error: blocksError } = await supabaseAdmin
    .from("user_blocks")
    .select("id, blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  if (blocksError) throw blocksError;
  if (!blocks || blocks.length === 0) return [];

  const blockedIds = blocks.map((b) => b.blocked_id);
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, city")
    .in("id", blockedIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return blocks.map((b) => {
    const p = profileMap.get(b.blocked_id);
    return {
      id: b.id,
      blockedId: b.blocked_id,
      firstName: p?.first_name ?? "Member",
      city: p?.city ?? null,
      blockedAt: b.created_at,
    };
  });
}

/**
 * Checks whether a bidirectional block exists between two users.
 */
export async function isBlockedPair(
  userA: string,
  userB: string,
): Promise<boolean> {
  if (!userA || !userB || userA === userB) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userA},blocked_id.eq.${userB}),and(blocker_id.eq.${userB},blocked_id.eq.${userA})`,
    )
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Returns a Set of all profile IDs that have a blocked relationship
 * with the caller in either direction (caller blocked them, or they blocked caller).
 */
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  if (error) throw error;

  const blockedSet = new Set<string>();
  for (const row of data ?? []) {
    if (row.blocker_id === userId) {
      blockedSet.add(row.blocked_id);
    } else if (row.blocked_id === userId) {
      blockedSet.add(row.blocker_id);
    }
  }
  return blockedSet;
}

// ── Reports ─────────────────────────────────────────────────────────────

/**
 * Submits a confidential conduct or safety report against another member.
 * Normal users can never read report contents or moderation status.
 */
export async function reportUser(
  userId: string,
  submission: ReportSubmission,
): Promise<ReportResult> {
  const validation = validateReportSubmission(userId, submission);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Verify reported user exists.
  const { data: reportedUser, error: reportedError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", submission.reportedUserId)
    .single();

  if (reportedError || !reportedUser) {
    throw new Error("Reported member not found.");
  }

  // Insert the report record.
  const { data: report, error: reportError } = await supabaseAdmin
    .from("user_reports")
    .insert({
      reporter_id: userId,
      reported_user_id: submission.reportedUserId,
      conversation_id: submission.conversationId ?? null,
      reason: submission.reason,
      description: submission.description?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (reportError) throw reportError;

  let alsoBlocked = false;
  if (submission.blockAlso) {
    await blockUser(userId, submission.reportedUserId);
    alsoBlocked = true;
  }

  return {
    success: true,
    reportId: report.id,
    alsoBlocked,
  };
}
