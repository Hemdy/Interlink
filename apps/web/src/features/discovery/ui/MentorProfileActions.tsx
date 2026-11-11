"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, ShieldAlert } from "lucide-react";
import type { SessionUser } from "@interlink/types";
import { REPORT_REASONS } from "@interlink/types";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthModal } from "@/features/auth/ui/AuthModalProvider";

export function MentorProfileActions({
  mentorId,
  mentorName,
  initialSaved,
  canRequest,
  user,
}: {
  mentorId: string;
  mentorName: string;
  initialSaved: boolean;
  canRequest: boolean;
  user: SessionUser | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { openSignIn } = useAuthModal();

  const [saved, setSaved] = useState(initialSaved);
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [introductionMessage, setIntroductionMessage] = useState("");
  const [careerObjective, setCareerObjective] = useState("");
  const [reasonForSelection, setReasonForSelection] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [preferredDuration, setPreferredDuration] = useState("3 months");
  const [relevantBackground, setRelevantBackground] = useState("");
  const [sessionPreference, setSessionPreference] = useState<"online" | "in_person" | "hybrid">(
    "online",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportReason, setReportReason] = useState<string>("misrepresentation");
  const [reportDesc, setReportDesc] = useState("");

  async function handleSaveToggle() {
    if (!user) {
      openSignIn();
      return;
    }
    const res = await fetch(`/api/v1/mentors/${mentorId}/save`, {
      method: saved ? "DELETE" : "POST",
    });
    if (res.ok) {
      setSaved((prev) => !prev);
      pushToast({
        kind: "success",
        title: saved ? "Removed from saved mentors" : "Mentor saved",
      });
    }
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/mentorship-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId,
          introductionMessage,
          careerObjective,
          reasonForSelection,
          expectedOutcome,
          preferredDuration,
          relevantBackground,
          sessionPreference,
        }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to submit request.");
        return;
      }
      pushToast({
        kind: "success",
        title: "Mentorship request submitted",
        description: `${mentorName} has been notified of your request.`,
      });
      setRequestOpen(false);
      router.push("/requests");
      router.refresh();
    } catch {
      setError("Network error submitting request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: mentorId,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      if (res.ok) {
        pushToast({ kind: "success", title: "Safety report submitted to administrators" });
        setReportOpen(false);
        setReportDesc("");
      } else {
        pushToast({ kind: "error", title: "Unable to submit report" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBlockUser() {
    if (!user) {
      openSignIn();
      return;
    }
    const res = await fetch("/api/v1/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedUserId: mentorId }),
    });
    if (res.ok) {
      pushToast({ kind: "info", title: `${mentorName} has been blocked` });
      router.push("/mentors");
    }
  }

  return (
    <div id="request" className="space-y-3">
      <Button
        className="w-full"
        disabled={!canRequest}
        onClick={() => {
          if (!user) {
            openSignIn();
            return;
          }
          setRequestOpen(true);
        }}
      >
        {canRequest ? "Request Mentorship" : "Currently Unavailable"}
      </Button>

      <Button variant="outline" className="w-full" onClick={handleSaveToggle}>
        <Bookmark className="h-4 w-4" />
        {saved ? "Saved to Bookmarks" : "Save Mentor"}
      </Button>

      {user && user.id !== mentorId && (
        <div className="flex items-center justify-between pt-2 text-xs text-interlink-muted">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 hover:text-red-600"
          >
            <Flag className="h-3.5 w-3.5" /> Report profile
          </button>
          <button
            type="button"
            onClick={handleBlockUser}
            className="inline-flex items-center gap-1 hover:text-red-600"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Block user
          </button>
        </div>
      )}

      {/* Structured Mentorship Request Modal */}
      <Modal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        title="Request Mentorship"
        maxWidthClass="max-w-xl"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink sm:p-8">
          <h2 className="font-display text-xl font-semibold text-interlink-ink">
            Request Mentorship with {mentorName}
          </h2>
          <p className="mt-1 text-xs text-interlink-muted">
            Structured requests help mentors understand your goals and confirm compatibility.
          </p>

          {error && (
            <div className="mt-4">
              <ErrorAlert message={error} />
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="mt-5 space-y-4">
            <Textarea
              label="Introduction Message"
              placeholder="Introduce yourself and your current stage..."
              value={introductionMessage}
              onChange={(e) => setIntroductionMessage(e.target.value)}
              required
              rows={3}
            />
            <Input
              label="Primary Career Objective"
              placeholder="e.g., Transition into Backend Engineering within 6 months"
              value={careerObjective}
              onChange={(e) => setCareerObjective(e.target.value)}
              required
            />
            <Textarea
              label="Why Did You Select This Mentor?"
              placeholder="Mention how their background or expertise aligns with your goals..."
              value={reasonForSelection}
              onChange={(e) => setReasonForSelection(e.target.value)}
              required
              rows={2}
            />
            <Textarea
              label="Expected Outcomes"
              placeholder="What specific milestones or skills do you hope to achieve?"
              value={expectedOutcome}
              onChange={(e) => setExpectedOutcome(e.target.value)}
              required
              rows={2}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Preferred Duration"
                value={preferredDuration}
                onChange={(e) => setPreferredDuration(e.target.value)}
              >
                <option value="1 month">1 month</option>
                <option value="3 months">3 months</option>
                <option value="6 months">6 months</option>
              </Select>
              <Select
                label="Preferred Session Format"
                value={sessionPreference}
                onChange={(e) =>
                  setSessionPreference(e.target.value as "online" | "in_person" | "hybrid")
                }
              >
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>
            <Textarea
              label="Relevant Background (Optional)"
              placeholder="Share education, current projects, or portfolio context..."
              value={relevantBackground}
              onChange={(e) => setRelevantBackground(e.target.value)}
              rows={2}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Submit Request
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Safety Report Modal */}
      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report User"
        maxWidthClass="max-w-md"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h2 className="font-display text-lg font-semibold text-interlink-ink">
            Report {mentorName}
          </h2>
          <form onSubmit={handleReportSubmit} className="mt-4 space-y-4">
            <Select
              label="Reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Textarea
              label="Details"
              placeholder="Describe the issue clearly for platform review..."
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" loading={submitting}>
                Submit Report
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
