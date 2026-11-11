"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, HelpCircle, X } from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

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
  status: string;
  mentorNotes: string | null;
  createdAt: string;
  mentee: { id: string; firstName: string; lastName: string } | null;
  mentor: { id: string; firstName: string; lastName: string } | null;
}

function daysAgo(dateIso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function RequestsClient({
  initialRequests,
  currentUserId,
}: {
  initialRequests: RequestItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [requests, setRequests] = useState(initialRequests);
  const [actionModal, setActionModal] = useState<{
    requestId: string;
    action: "reject" | "request-info";
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const incoming = requests.filter((r) => r.mentorId === currentUserId);
  const outgoing = requests.filter((r) => r.menteeId === currentUserId);

  async function handleAccept(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/v1/mentorship-requests/${requestId}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await res.json()) as {
        data?: { mentorship?: { id: string } };
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
      pushToast({
        kind: "success",
        title: "Mentorship established!",
        description: "Redirecting to your new mentorship workspace.",
      });
      if (json.data?.mentorship?.id) {
        router.push(`/mentorships/${json.data.mentorship.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(requestId: string) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/v1/mentorship-requests/${requestId}/cancel`, {
        method: "PATCH",
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled" } : r)),
        );
        pushToast({ kind: "info", title: "Mentorship request withdrawn" });
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleActionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actionModal) return;
    setBusyId(actionModal.requestId);
    try {
      const endpoint =
        actionModal.action === "reject"
          ? `/api/v1/mentorship-requests/${actionModal.requestId}/reject`
          : `/api/v1/mentorship-requests/${actionModal.requestId}/request-info`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        const nextStatus = actionModal.action === "reject" ? "rejected" : "info_requested";
        setRequests((prev) =>
          prev.map((r) =>
            r.id === actionModal.requestId
              ? { ...r, status: nextStatus, mentorNotes: notes }
              : r,
          ),
        );
        pushToast({ kind: "success", title: "Request updated" });
        setActionModal(null);
        setNotes("");
      }
    } finally {
      setBusyId(null);
    }
  }

  const statusTone = (status: string) => {
    if (status === "accepted") return "success";
    if (status === "rejected" || status === "cancelled") return "danger";
    if (status === "info_requested") return "warning";
    return "forest";
  };

  return (
    <div className="space-y-10">
      {/* Incoming Mentor Queue */}
      <section>
        <h2 className="font-display text-lg font-semibold text-interlink-ink">
          Incoming Mentorship Requests ({incoming.length})
        </h2>
        {incoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No incoming mentorship requests"
              description="Requests submitted by mentees will appear here with their career objectives and expected outcomes."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {incoming.map((req) => (
              <Card key={req.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-interlink-ink">
                        {req.mentee
                          ? `${req.mentee.firstName} ${req.mentee.lastName}`
                          : "Mentee"}
                      </h3>
                      <Badge tone={statusTone(req.status)}>
                        {req.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-interlink-muted">
                      <Clock className="h-3.5 w-3.5" /> Submitted {daysAgo(req.createdAt)} &middot;{" "}
                      {req.preferredDuration} &middot; {req.sessionPreference}
                    </p>
                  </div>

                  {["pending", "info_requested"].includes(req.status) && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        loading={busyId === req.id}
                        onClick={() => handleAccept(req.id)}
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      {req.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActionModal({ requestId: req.id, action: "request-info" })}
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Request Info
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActionModal({ requestId: req.id, action: "reject" })}
                      >
                        <X className="h-3.5 w-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs md:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-600">Career Objective</dt>
                    <dd className="mt-0.5 text-interlink-ink">{req.careerObjective}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Expected Outcomes</dt>
                    <dd className="mt-0.5 text-interlink-ink">{req.expectedOutcome}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-semibold text-slate-600">Introduction</dt>
                    <dd className="mt-0.5 text-slate-700">{req.introductionMessage}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="font-semibold text-slate-600">Why They Selected You</dt>
                    <dd className="mt-0.5 text-slate-700">{req.reasonForSelection}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing Mentee Requests */}
      <section>
        <h2 className="font-display text-lg font-semibold text-interlink-ink">
          My Sent Requests ({outgoing.length})
        </h2>
        {outgoing.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No sent mentorship requests"
              description="Browse the mentor directory to submit a structured mentorship request."
              action={
                <Link
                  href="/mentors"
                  className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
                >
                  Find a Mentor
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {outgoing.map((req) => (
              <Card key={req.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/mentors/${req.mentorId}`}
                        className="text-base font-semibold text-interlink-ink hover:text-interlink-forest"
                      >
                        {req.mentor
                          ? `${req.mentor.firstName} ${req.mentor.lastName}`
                          : "Mentor"}
                      </Link>
                      <Badge tone={statusTone(req.status)}>
                        {req.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-interlink-muted">
                      Sent {daysAgo(req.createdAt)} &middot; Objective: {req.careerObjective}
                    </p>
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
                  <div className="mt-3 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <span className="font-semibold">Mentor Note:</span> {req.mentorNotes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

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
    </div>
  );
}
