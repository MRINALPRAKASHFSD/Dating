/**
 * Pure safety and privacy domain logic.
 *
 * Validation rules, bidirectional block checks, and filter helpers.
 * In-memory only — no network or database calls.
 */

import type { ReportReason, ReportSubmission } from "./types";
import { REPORT_REASONS } from "./types";

/**
 * Validates whether a user can block a target profile.
 * Users cannot block themselves.
 */
export function validateBlockTarget(
  blockerId: string,
  targetUserId: string,
): { valid: boolean; error?: string } {
  if (!blockerId || !targetUserId) {
    return { valid: false, error: "Both user IDs are required." };
  }
  if (blockerId === targetUserId) {
    return { valid: false, error: "You cannot block yourself." };
  }
  return { valid: true };
}

/**
 * Validates a user report submission.
 */
export function validateReportSubmission(
  reporterId: string,
  submission: ReportSubmission,
): { valid: boolean; error?: string } {
  if (!reporterId || !submission.reportedUserId) {
    return { valid: false, error: "Reporter and reported user IDs are required." };
  }
  if (reporterId === submission.reportedUserId) {
    return { valid: false, error: "You cannot report yourself." };
  }
  if (!REPORT_REASONS.includes(submission.reason)) {
    return { valid: false, error: `Invalid report reason: ${submission.reason}` };
  }
  if (submission.description && submission.description.length > 2000) {
    return { valid: false, error: "Report description cannot exceed 2000 characters." };
  }
  return { valid: true };
}

/**
 * Determines whether two user IDs are in a blocked relationship in either direction.
 */
export function isPairBlocked(
  userA: string,
  userB: string,
  blockedPairs: ReadonlyArray<{ blockerId: string; blockedId: string }>,
): boolean {
  return blockedPairs.some(
    (b) =>
      (b.blockerId === userA && b.blockedId === userB) ||
      (b.blockerId === userB && b.blockedId === userA),
  );
}

/**
 * Collects a set of all user IDs that have a blocked relationship
 * (in either direction) with the given user.
 */
export function getBlockedUserIdsFor(
  userId: string,
  blocks: ReadonlyArray<{ blocker_id: string; blocked_id: string }>,
): Set<string> {
  const set = new Set<string>();
  for (const block of blocks) {
    if (block.blocker_id === userId) {
      set.add(block.blocked_id);
    } else if (block.blocked_id === userId) {
      set.add(block.blocker_id);
    }
  }
  return set;
}
