/** Shared types for the Kindred safety, privacy, and moderation controls. */

import type { Tables } from "@/integrations/supabase/types";

// ── Database row aliases ────────────────────────────────────────────────

export type UserBlockRow = Tables<"user_blocks">;
export type UserReportRow = Tables<"user_reports">;

// ── Domain types ────────────────────────────────────────────────────────

export type ReportReason =
  | "Harassment"
  | "Spam"
  | "Fake profile"
  | "Inappropriate content"
  | "Unsafe behaviour"
  | "Other";

export const REPORT_REASONS: readonly ReportReason[] = [
  "Harassment",
  "Spam",
  "Fake profile",
  "Inappropriate content",
  "Unsafe behaviour",
  "Other",
] as const;

export type ReportStatus =
  | "pending"
  | "investigating"
  | "resolved"
  | "dismissed";

export type BlockedMemberSummary = {
  /** ID of the block record */
  id: string;
  /** Profile ID of the blocked member */
  blockedId: string;
  /** First name of the blocked member */
  firstName: string;
  /** City of the blocked member */
  city: string | null;
  /** ISO timestamp when the block was created */
  blockedAt: string;
};

export type ReportSubmission = {
  reportedUserId: string;
  reason: ReportReason;
  description?: string | null | undefined;
  conversationId?: string | null | undefined;
  blockAlso?: boolean | undefined;
};

export type BlockResult = {
  success: boolean;
  blockedId: string;
  alreadyBlocked?: boolean | undefined;
};

export type UnblockResult = {
  success: boolean;
  unblockedId: string;
};

export type ReportResult = {
  success: boolean;
  reportId: string;
  alsoBlocked: boolean;
};
