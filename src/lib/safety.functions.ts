import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BlockedMemberSummary,
  BlockResult,
  ReportResult,
} from "@/lib/safety/types";
import { REPORT_REASONS } from "@/lib/safety/types";

// ── Blocks ──────────────────────────────────────────────────────────────

/** Block another member. */
export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<BlockResult> => {
    const { blockUser: block } = await import("@/lib/safety/safety.server");
    return block(context.userId, data.targetUserId);
  });

/** Unblock a previously blocked member. */
export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ success: boolean }> => {
    const { unblockUser: unblock } = await import("@/lib/safety/safety.server");
    return unblock(context.userId, data.targetUserId);
  });

/** Fetch list of members blocked by the authenticated member. */
export const getBlockedUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlockedMemberSummary[]> => {
    const { getBlockedUsers: fetchBlocked } = await import(
      "@/lib/safety/safety.server"
    );
    return fetchBlocked(context.userId);
  });

// ── Reports ─────────────────────────────────────────────────────────────

/** Submit a confidential member report. */
export const reportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        reportedUserId: z.string().uuid(),
        reason: z.enum([
          "Harassment",
          "Spam",
          "Fake profile",
          "Inappropriate content",
          "Unsafe behaviour",
          "Other",
        ]),
        description: z.string().max(2000).optional().nullable(),
        conversationId: z.string().uuid().optional().nullable(),
        blockAlso: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<ReportResult> => {
    const { reportUser: report } = await import("@/lib/safety/safety.server");
    return report(context.userId, {
      reportedUserId: data.reportedUserId,
      reason: data.reason,
      description: data.description,
      conversationId: data.conversationId,
      blockAlso: data.blockAlso,
    });
  });
