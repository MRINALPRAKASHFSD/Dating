import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserX, Flag, Check, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { blockUser, unblockUser, getBlockedUsers, reportUser } from "@/lib/safety.functions";
import type { BlockedMemberSummary, ReportReason } from "@/lib/safety/types";
import { REPORT_REASONS } from "@/lib/safety/types";
import { cn } from "@/lib/utils";

// ── Block Confirmation Dialog ──────────────────────────────────────────

export function BlockConfirmationDialog({
  open,
  onOpenChange,
  targetUserId,
  targetName,
  onBlocked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}) {
  const queryClient = useQueryClient();

  const blockMutation = useMutation({
    mutationFn: async () => {
      return blockUser({ data: { targetUserId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["compatible-matches"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      onOpenChange(false);
      onBlocked?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-background p-6 shadow-xl sm:rounded-2xl">
        <DialogHeader className="text-left">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <UserX className="size-5" />
          </div>
          <DialogTitle className="font-display text-2xl tracking-tight text-primary">
            Block {targetName}?
          </DialogTitle>
          <DialogDescription className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Blocking will immediately stop communication, remove {targetName} from your connections,
            and ensure neither of you will see each other in discovery or messaging.
          </DialogDescription>
          <p className="mt-2 text-[13px] text-muted-foreground/80">
            This action is private and can be undone at any time from your profile settings.
          </p>
        </DialogHeader>

        {blockMutation.isError && (
          <p role="alert" className="text-[13px] font-medium text-destructive">
            {blockMutation.error instanceof Error
              ? blockMutation.error.message
              : "Unable to block member. Please try again."}
          </p>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={blockMutation.isPending}
            className="h-11 rounded-xl text-[14px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-primary"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => blockMutation.mutate()}
            disabled={blockMutation.isPending}
            className="h-11 rounded-xl bg-primary px-5 text-[14px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {blockMutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Blocking…
              </>
            ) : (
              `Block ${targetName}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Report User Dialog ──────────────────────────────────────────────────

export function ReportUserDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedName,
  conversationId,
  onReported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedName: string;
  conversationId?: string | null;
  onReported?: (alsoBlocked: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<ReportReason>("Harassment");
  const [description, setDescription] = useState("");
  const [blockAlso, setBlockAlso] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setReason("Harassment");
    setDescription("");
    setBlockAlso(true);
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const reportMutation = useMutation({
    mutationFn: async () => {
      return reportUser({
        data: {
          reportedUserId,
          reason,
          description: description.trim() || null,
          conversationId: conversationId ?? null,
          blockAlso,
        },
      });
    },
    onSuccess: (result) => {
      if (result.alsoBlocked) {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["compatible-matches"] });
        queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      }
      setSubmitted(true);
    },
  });

  const handleDone = () => {
    const wasBlocked = blockAlso;
    handleOpenChange(false);
    onReported?.(wasBlocked);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-background p-6 shadow-xl sm:rounded-2xl">
        {submitted ? (
          <div className="py-2 text-left">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <ShieldCheck className="size-6" />
            </div>
            <DialogTitle className="font-display text-2xl tracking-tight text-primary">
              Report received
            </DialogTitle>
            <DialogDescription className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Thank you for helping keep Kindred safe. Our team reviews all reports thoughtfully and
              confidentially.
            </DialogDescription>
            {blockAlso && (
              <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-primary">{reportedName}</span> has been blocked and
                removed from your connections.
              </p>
            )}
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={handleDone}
                className="h-11 rounded-xl bg-primary px-6 text-[14px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="text-left">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Flag className="size-5" />
              </div>
              <DialogTitle className="font-display text-2xl tracking-tight text-primary">
                Report {reportedName}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                Your report is confidential and will never be shared with {reportedName}.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-[13px] font-medium text-foreground">
                  Reason for reporting
                </Label>
                <RadioGroup
                  value={reason}
                  onValueChange={(val) => setReason(val as ReportReason)}
                  className="mt-2.5 grid gap-2"
                >
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      htmlFor={`report-reason-${r}`}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border p-3 text-[14px] transition-all",
                        reason === r
                          ? "border-accent bg-accent/5 font-medium text-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground",
                      )}
                    >
                      <span>{r}</span>
                      <RadioGroupItem value={r} id={`report-reason-${r}`} className="text-accent" />
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="report-description" className="text-[13px] font-medium text-foreground">
                    Additional context <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">{description.length}/2000</span>
                </div>
                <Textarea
                  id="report-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="Provide any details that will help us understand the situation..."
                  className="mt-2 min-h-[90px] resize-none rounded-xl border-border/60 bg-transparent p-3 text-[14px] leading-relaxed focus:border-accent"
                />
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3.5">
                <Checkbox
                  id="report-block-also"
                  checked={blockAlso}
                  onCheckedChange={(checked) => setBlockAlso(Boolean(checked))}
                  className="mt-0.5"
                />
                <label
                  htmlFor="report-block-also"
                  className="cursor-pointer text-[13px] leading-snug text-muted-foreground"
                >
                  <span className="font-medium text-primary">Also block {reportedName}</span>
                  <br />
                  Ends conversation and prevents future discovery or messaging.
                </label>
              </div>
            </div>

            {reportMutation.isError && (
              <p role="alert" className="mt-2 text-[13px] font-medium text-destructive">
                {reportMutation.error instanceof Error
                  ? reportMutation.error.message
                  : "Unable to submit report. Please try again."}
              </p>
            )}

            <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={reportMutation.isPending}
                className="h-11 rounded-xl text-[14px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-primary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending}
                className="h-11 rounded-xl bg-primary px-5 text-[14px] font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit report"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Blocked Members Privacy / Settings View ────────────────────────────

export function BlockedMembersSettings() {
  const queryClient = useQueryClient();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const {
    data: blockedUsers = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      return getBlockedUsers();
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      setUnblockingId(targetUserId);
      return unblockUser({ data: { targetUserId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["compatible-matches"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onSettled: () => {
      setUnblockingId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border/50 p-6 text-center">
        <p className="text-[14px] text-muted-foreground">Unable to load blocked members.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          className="mt-3 h-9 rounded-lg text-[13px]"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-primary">Blocked members</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Blocked members cannot send you messages or find you in discovery. You can unblock them at
          any time.
        </p>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/15 p-6 text-center">
          <p className="text-[14px] font-medium text-primary">No blocked members</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            When you block someone, they will appear here so you can review or unblock them.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-background">
          {blockedUsers.map((member: BlockedMemberSummary) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 transition-colors hover:bg-secondary/20"
            >
              <div className="min-w-0 pr-4">
                <p className="truncate text-[15px] font-medium text-primary">{member.firstName}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {member.city ? `${member.city} · ` : ""}
                  Blocked {new Date(member.blockedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={unblockingId === member.blockedId}
                onClick={() => unblockMutation.mutate(member.blockedId)}
                className="h-9 shrink-0 rounded-xl border-border/60 text-[13px] font-medium hover:border-accent hover:text-accent"
              >
                {unblockingId === member.blockedId ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Unblock"
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
