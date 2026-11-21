"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Clock,
  HelpCircle,
  Inbox,
  MessageSquare,
  Send,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface RequestItem {
  id: string;
  menteeId: string;
  mentorId: string;
  introductionMessage: string;
  careerObjective: string;
  reasonForSelection: string;
  expectedOutcome: string;
  preferredDuration: string;
  sessionPreference: string;
  billingCadence?: string;
  agreedAmountNgn?: number;
  selectedSlotSummary?: string | null;
  status: string;
  mentorNotes: string | null;
  createdAt: string;
  mentee: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
  } | null;
  mentor: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
  } | null;
}

interface TransactionItem {
  id: string;
  requestId: string;
  mentorId: string;
  menteeId: string;
  billingCadence: string;
  grossAmountNgn: number;
  platformFeeNgn: number;
  mentorPayoutNgn: number;
  provider: string;
  providerReference: string | null;
  status: string;
  createdAt: string;
  settledAt: string | null;
  mentor: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
  } | null;
  mentee: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
  } | null;
}

function daysAgo(dateIso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function RequestsClient({
  initialRequests,
  initialTransactions = [],
  currentUserId,
}: {
  initialRequests: RequestItem[];
  initialTransactions?: TransactionItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const DEFAULT_WELCOME_MESSAGE =
    "Hello! I'm excited to be your mentor. Looking forward to supporting you on your journey!";

  const [requests, setRequests] = useState(initialRequests);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [actionModal, setActionModal] = useState<{
    requestId: string;
    action: "reject" | "request-info";
  } | null>(null);
  const [acceptModalTarget, setAcceptModalTarget] = useState<RequestItem | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const incoming = useMemo(
    () => requests.filter((r) => r.mentorId === currentUserId),
    [currentUserId, requests],
  );
  const outgoing = useMemo(
    () => requests.filter((r) => r.menteeId === currentUserId),
    [currentUserId, requests],
  );
  const pendingIncomingCount = useMemo(
    () => incoming.filter((r) => ["pending", "info_requested"].includes(r.status)).length,
    [incoming],
  );

  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing" | "ledger">(() =>
    incoming.length > 0 ? "incoming" : outgoing.length > 0 ? "outgoing" : "incoming",
  );
  const [incomingStatusFilter, setIncomingStatusFilter] = useState<"all" | "pending">("all");

  const visibleIncoming = useMemo(
    () =>
      incomingStatusFilter === "pending"
        ? incoming.filter((r) => ["pending", "info_requested"].includes(r.status))
        : incoming,
    [incoming, incomingStatusFilter],
  );

  async function handleAccept(requestId: string, initialGreeting?: string | null) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/v1/mentorship-requests/${requestId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initialMessage: initialGreeting?.trim() ? initialGreeting.trim() : undefined,
        }),
      });
      const json = (await res.json()) as {
        data?: { mentorship?: { id: string }; conversationId?: string };
        error?: { message: string };
      };
      if (!res.ok) {
        pushToast({
          kind: "error",
          title: "Cannot accept request",
          description: json.error?.message,
        });
        return;
      }
      setAcceptModalTarget(null);
      pushToast({
        kind: "success",
        title: "Mentorship established!",
        description: initialGreeting?.trim()
          ? "Welcome message sent. Opening your mentorship conversation."
          : "Redirecting to your new mentorship workspace.",
      });
      if (json.data?.mentorship?.id) {
        router.push(`/mentorships/${json.data.mentorship.id}?tab=messages`);
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(requestId: string) {
    const previous = requests;
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled" } : r)),
    );
    pushToast({ kind: "info", title: "Mentorship request withdrawn" });

    try {
      const res = await fetch(`/api/v1/mentorship-requests/${requestId}/cancel`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setRequests(previous);
      pushToast({ kind: "error", title: "Unable to withdraw request. Please retry." });
    }
  }

  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actionModal) return;

    const targetId = actionModal.requestId;
    const nextStatus = actionModal.action === "reject" ? "rejected" : "info_requested";
    const endpoint =
      actionModal.action === "reject"
        ? `/api/v1/mentorship-requests/${targetId}/reject`
        : `/api/v1/mentorship-requests/${targetId}/request-info`;
    const submittedNotes = notes;
    const previous = requests;

    // Optimistic UI update before waiting on server response
    setRequests((prev) =>
      prev.map((r) =>
        r.id === targetId ? { ...r, status: nextStatus, mentorNotes: submittedNotes } : r,
      ),
    );
    setActionModal(null);
    setNotes("");
    pushToast({ kind: "success", title: "Request updated" });

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: submittedNotes }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setRequests(previous);
      pushToast({ kind: "error", title: "Unable to update request. Restored previous state." });
    }
  }

  const statusTone = (status: string) => {
    if (status === "accepted") return "success";
    if (status === "rejected" || status === "cancelled") return "danger";
    if (status === "info_requested") return "warning";
    return "forest";
  };

  async function handleTransactionAction(
    txId: string,
    action: "mark_completed" | "cancel",
  ) {
    setBusyId(txId);
    try {
      const res = await fetch(`/api/v1/mentorships/transactions?id=${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as {
        data?: { transaction?: TransactionItem };
        error?: { message: string };
      };
      if (!res.ok) {
        pushToast({ kind: "error", title: json.error?.message ?? "Unable to update booking" });
        return;
      }
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? {
                ...t,
                status: action === "cancel" ? "cancelled" : "completed",
                settledAt: action === "cancel" ? null : new Date().toISOString(),
              }
            : t,
        ),
      );
      pushToast({
        kind: "success",
        title: action === "cancel" ? "Checkout intent cancelled" : "Paid mentorship confirmed",
        description:
          action === "mark_completed"
            ? "85% mentor payout & 15% Interlink commission recorded in ledger."
            : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  const mentorLedgerRows = transactions.filter((t) => t.mentorId === currentUserId);
  const settledMentorPayout = mentorLedgerRows
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.mentorPayoutNgn, 0);
  const settledPlatformFee = mentorLedgerRows
    .filter((t) => t.status === "completed")
    .reduce((sum, t) => sum + t.platformFeeNgn, 0);

  return (
    <div className="space-y-6">
      {/* Top Overview & Segmented Filter Tabs */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-interlink-ink">
              Mentorship Requests
            </h1>
            <p className="mt-0.5 text-xs text-interlink-muted">
              Review incoming mentee applications, track sent requests, and manage bookings.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-interlink-forest/10 px-3 py-1 text-xs font-semibold text-interlink-forest dark:bg-interlink-forest/20 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {pendingIncomingCount} awaiting review
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-interlink-app-bg px-3 py-1 text-xs font-medium text-interlink-muted">
              {outgoing.length} sent
            </span>
          </div>
        </div>

        <div className="no-scrollbar mt-5 flex items-center gap-2 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("incoming")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "incoming"
                ? "bg-interlink-forest text-white shadow-subtle"
                : "bg-interlink-app-bg text-interlink-muted hover:text-interlink-ink"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Incoming ({incoming.length})</span>
            {pendingIncomingCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activeTab === "incoming"
                    ? "bg-white text-interlink-forest"
                    : "bg-interlink-forest text-white"
                }`}
              >
                {pendingIncomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "outgoing"
                ? "bg-interlink-forest text-white shadow-subtle"
                : "bg-interlink-app-bg text-interlink-muted hover:text-interlink-ink"
            }`}
          >
            <Send className="h-3.5 w-3.5" aria-hidden="true" />
            <span>My Sent ({outgoing.length})</span>
          </button>

          {transactions.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("ledger")}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === "ledger"
                  ? "bg-interlink-forest text-white shadow-subtle"
                  : "bg-interlink-app-bg text-interlink-muted hover:text-interlink-ink"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bookings &amp; Ledger ({transactions.length})</span>
            </button>
          )}
        </div>
      </Card>

      {/* Incoming Mentor Queue */}
      {activeTab === "incoming" && (
        <section className="space-y-4">
          {incoming.length > 0 && pendingIncomingCount > 0 && pendingIncomingCount < incoming.length && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIncomingStatusFilter("all")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  incomingStatusFilter === "all"
                    ? "bg-interlink-ink text-interlink-surface"
                    : "bg-interlink-surface text-interlink-muted shadow-subtle hover:text-interlink-ink"
                }`}
              >
                All ({incoming.length})
              </button>
              <button
                type="button"
                onClick={() => setIncomingStatusFilter("pending")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  incomingStatusFilter === "pending"
                    ? "bg-interlink-ink text-interlink-surface"
                    : "bg-interlink-surface text-interlink-muted shadow-subtle hover:text-interlink-ink"
                }`}
              >
                Needs Action ({pendingIncomingCount})
              </button>
            </div>
          )}

          {visibleIncoming.length === 0 ? (
            <EmptyState
              title="No incoming mentorship requests"
              description="Requests submitted by mentees will appear here with their career objectives and expected outcomes."
            />
          ) : (
            <div className="space-y-4">
              {visibleIncoming.map((req) => {
                const menteeName = req.mentee
                  ? `${req.mentee.firstName} ${req.mentee.lastName}`
                  : "Mentee";
                const isActionable = ["pending", "info_requested"].includes(req.status);

                return (
                  <Card key={req.id} className="space-y-5 p-5 sm:p-6">
                    {/* Card Header: Avatar, Identity, Metadata Pills, Status */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <UserAvatar
                          src={req.mentee?.profileImage}
                          firstName={req.mentee?.firstName ?? "M"}
                          lastName={req.mentee?.lastName ?? ""}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-base font-semibold text-interlink-ink sm:text-lg">
                              {menteeName}
                            </h2>
                            <Badge tone={statusTone(req.status)}>
                              {req.status.replace(/_/g, " ")}
                            </Badge>
                            {typeof req.agreedAmountNgn === "number" && req.agreedAmountNgn > 0 && (
                              <Badge tone="gold">
                                ₦{req.agreedAmountNgn.toLocaleString("en-NG")} &middot;{" "}
                                {(req.billingCadence ?? "paid").replace("_", " ")}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-interlink-muted">
                            <span className="inline-flex items-center gap-1 rounded-full bg-interlink-app-bg px-2.5 py-0.5 font-medium">
                              <Clock className="h-3 w-3 text-interlink-forest" aria-hidden="true" />
                              {daysAgo(req.createdAt)}
                            </span>
                            <span className="rounded-full bg-interlink-app-bg px-2.5 py-0.5 font-medium">
                              {req.preferredDuration}
                            </span>
                            <span className="rounded-full bg-interlink-app-bg px-2.5 py-0.5 font-medium">
                              {req.sessionPreference}
                            </span>
                            {req.selectedSlotSummary && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-interlink-forest/10 px-2.5 py-0.5 font-medium text-interlink-forest dark:bg-interlink-forest/20 dark:text-emerald-300">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                {req.selectedSlotSummary}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Structured Borderless Highlights */}
                    <dl className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                      <div className="rounded-xl bg-interlink-app-bg p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-interlink-forest dark:text-emerald-300">
                          Career Objective
                        </dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-interlink-ink">
                          {req.careerObjective}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-interlink-app-bg p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-interlink-forest dark:text-emerald-300">
                          Expected Outcomes
                        </dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-interlink-ink">
                          {req.expectedOutcome}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-interlink-app-bg p-3.5 md:col-span-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-interlink-muted">
                          Introduction
                        </dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-interlink-ink/90">
                          {req.introductionMessage}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-interlink-app-bg p-3.5 md:col-span-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-interlink-muted">
                          Why They Selected You
                        </dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-interlink-ink/90">
                          {req.reasonForSelection}
                        </dd>
                      </div>
                    </dl>

                    {req.mentorNotes && (
                      <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        <span className="font-semibold">Your Note:</span> {req.mentorNotes}
                      </div>
                    )}

                    {/* Action Bar */}
                    {isActionable && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionModal({ requestId: req.id, action: "reject" })}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Decline
                        </Button>
                        {req.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActionModal({ requestId: req.id, action: "request-info" })}
                          >
                            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Request Info
                          </Button>
                        )}
                        <Button
                          size="sm"
                          loading={busyId === req.id}
                          onClick={() => {
                            setWelcomeMessage(DEFAULT_WELCOME_MESSAGE);
                            setAcceptModalTarget(req);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Accept &amp; Connect
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Outgoing Mentee Requests */}
      {activeTab === "outgoing" && (
        <section className="space-y-4">
          {outgoing.length === 0 ? (
            <EmptyState
              title="No sent mentorship requests"
              description="Browse the mentor directory to submit a structured mentorship request."
              action={
                <Link
                  href="/mentors"
                  className="inline-flex items-center rounded-full bg-interlink-forest px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                >
                  Find a Mentor
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {outgoing.map((req) => (
                <Card key={req.id} className="space-y-3 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar
                        src={req.mentor?.profileImage}
                        firstName={req.mentor?.firstName ?? "M"}
                        lastName={req.mentor?.lastName ?? ""}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/mentors/${req.mentorId}`}
                            className="font-display text-base font-semibold text-interlink-ink hover:text-interlink-forest"
                          >
                            {req.mentor
                              ? `${req.mentor.firstName} ${req.mentor.lastName}`
                              : "Mentor"}
                          </Link>
                          <Badge tone={statusTone(req.status)}>
                            {req.status.replace(/_/g, " ")}
                          </Badge>
                          {typeof req.agreedAmountNgn === "number" && req.agreedAmountNgn > 0 && (
                            <Badge tone="gold">
                              ₦{req.agreedAmountNgn.toLocaleString("en-NG")}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-interlink-muted">
                          Sent {daysAgo(req.createdAt)} &middot; {req.careerObjective}
                        </p>
                      </div>
                    </div>

                    {["pending", "info_requested"].includes(req.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busyId === req.id}
                        onClick={() => handleCancel(req.id)}
                      >
                        Withdraw Request
                      </Button>
                    )}
                  </div>

                  {req.mentorNotes && (
                    <div className="rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      <span className="font-semibold">Mentor Note:</span> {req.mentorNotes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Paid Mentorship Bookings & 85% / 15% Commission Ledger */}
      {activeTab === "ledger" && transactions.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-interlink-ink">
                Paid Mentorship Bookings &amp; Ledger ({transactions.length})
              </h2>
              <p className="text-xs text-interlink-muted">
                Paystack-ready settlement split: 85% mentor payout &middot; 15% Interlink commission.
              </p>
            </div>
            {mentorLedgerRows.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="forest">
                  Mentor Payout (85%): ₦{settledMentorPayout.toLocaleString("en-NG")}
                </Badge>
                <Badge tone="neutral">
                  Platform Fee (15%): ₦{settledPlatformFee.toLocaleString("en-NG")}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {transactions.map((tx) => {
              const isMentee = tx.menteeId === currentUserId;
              const partnerName = isMentee
                ? tx.mentor
                  ? `${tx.mentor.firstName} ${tx.mentor.lastName}`
                  : "Mentor"
                : tx.mentee
                  ? `${tx.mentee.firstName} ${tx.mentee.lastName}`
                  : "Mentee";
              return (
                <Card key={tx.id}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-interlink-ink">
                          {isMentee ? `Booking with ${partnerName}` : `Earnings from ${partnerName}`}
                        </span>
                        <Badge
                          tone={
                            tx.status === "completed"
                              ? "success"
                              : tx.status === "cancelled"
                                ? "danger"
                                : "gold"
                          }
                        >
                          {tx.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-interlink-muted">
                        Gross: ₦{tx.grossAmountNgn.toLocaleString("en-NG")} &middot; Mentor (85%): ₦
                        {tx.mentorPayoutNgn.toLocaleString("en-NG")} &middot; Interlink (15%): ₦
                        {tx.platformFeeNgn.toLocaleString("en-NG")}
                        {tx.providerReference ? ` · Ref: ${tx.providerReference}` : ""}
                      </p>
                    </div>

                    {tx.status === "pending_checkout" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          loading={busyId === tx.id}
                          onClick={() => handleTransactionAction(tx.id, "mark_completed")}
                        >
                          Confirm Payment Settlement
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={busyId === tx.id}
                          onClick={() => handleTransactionAction(tx.id, "cancel")}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        open={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title="Respond to Request"
        maxWidthClass="max-w-md"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            {actionModal?.action === "reject"
              ? "Decline Mentorship Request"
              : "Request Additional Information"}
          </h3>
          <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
            <Textarea
              label="Message to Mentee"
              placeholder={
                actionModal?.action === "reject"
                  ? "Optional note explaining availability or next steps..."
                  : "Ask for specific clarification on their background or goals..."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={actionModal?.action === "request-info"}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={busyId === actionModal?.requestId}>
                Submit
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Accept Request & Start Private Conversation Modal */}
      <Modal
        open={Boolean(acceptModalTarget)}
        onClose={() => setAcceptModalTarget(null)}
        title="Accept Request & Start Conversation"
        maxWidthClass="max-w-lg"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] bg-interlink-forest/15 text-interlink-forest dark:bg-interlink-forest/25">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-interlink-ink">
                Start Private Conversation
              </h3>
              <p className="mt-0.5 text-xs text-interlink-muted">
                Accepting this request automatically creates a private, secure workspace and conversation between you and{" "}
                <span className="font-semibold text-interlink-ink">
                  {acceptModalTarget?.mentee ? `${acceptModalTarget.mentee.firstName} ${acceptModalTarget.mentee.lastName}` : "the mentee"}
                </span>.
              </p>
            </div>
          </div>

          {acceptModalTarget && (
            <div className="mt-4 rounded-xl bg-interlink-app-bg p-3.5 text-xs">
              <p className="font-semibold text-interlink-ink">Mentee Career Objective:</p>
              <p className="mt-0.5 text-interlink-muted">{acceptModalTarget.careerObjective}</p>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            <label htmlFor="welcome-msg" className="block text-xs font-medium text-interlink-ink">
              Send an Initial Welcome Greeting:
            </label>
            <Textarea
              id="welcome-msg"
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Type your initial greeting..."
            />
            <p className="text-[11px] text-interlink-muted">
              Suggested message is ready to send. You can personalize it or accept without an initial greeting.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAcceptModalTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={busyId === acceptModalTarget?.id}
              onClick={() => acceptModalTarget && handleAccept(acceptModalTarget.id, null)}
            >
              Accept Without Message
            </Button>
            <Button
              size="sm"
              loading={busyId === acceptModalTarget?.id}
              onClick={() => acceptModalTarget && handleAccept(acceptModalTarget.id, welcomeMessage)}
            >
              Accept &amp; Send Message
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
