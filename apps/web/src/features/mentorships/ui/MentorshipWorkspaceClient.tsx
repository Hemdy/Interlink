"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate, formatDateTime, formatTime } from "@interlink/utils";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Plus,
  Star,
  Target,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { ConversationChatPanel } from "@/features/messaging/ui/ConversationChatPanel";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  evidenceUrl: string | null;
}

interface ProgressUpdate {
  id: string;
  description: string;
  evidenceUrl: string | null;
  createdAt: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  expectedOutcome: string | null;
  targetDate: string | null;
  status: string;
  mentorFeedback: string | null;
  milestones: Milestone[];
  updates: ProgressUpdate[];
  progressPercent: number;
}

interface SessionItem {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  meetingLink: string | null;
  sessionType: string;
  status: string;
  attendanceStatus: string;
  summary: string | null;
}

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
}

interface ResourceItem {
  id: string;
  title: string;
  description: string;
  resourceType: string;
  externalUrl: string;
  createdAt: string;
}

export function MentorshipWorkspaceClient({
  currentUserId,
  mentorship,
  mentor,
  mentee,
  originRequest,
  initialGoals,
  initialSessions,
  conversationId,
  initialMessages,
  initialResources,
  hasSubmittedReview,
}: {
  currentUserId: string;
  mentorship: {
    id: string;
    mentorId: string;
    menteeId: string;
    status: string;
    agreedExpectations: string | null;
    completionSummary: string | null;
    startDate: string;
  };
  mentor: Participant | null;
  mentee: Participant | null;
  originRequest: {
    careerObjective: string;
    expectedOutcome: string;
    preferredDuration: string;
  } | null;
  initialGoals: Goal[];
  initialSessions: SessionItem[];
  conversationId: string | null;
  initialMessages: MessageItem[];
  initialResources: ResourceItem[];
  hasSubmittedReview: boolean;
}) {
  const { pushToast } = useToast();
  const isMentor = mentorship.mentorId === currentUserId;
  const partner = isMentor ? mentee : mentor;

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<"overview" | "goals" | "sessions" | "messages" | "resources">(() => {
    if (
      requestedTab === "messages" ||
      requestedTab === "goals" ||
      requestedTab === "sessions" ||
      requestedTab === "resources"
    ) {
      return requestedTab;
    }
    return "overview";
  });

  useEffect(() => {
    if (
      requestedTab === "messages" ||
      requestedTab === "goals" ||
      requestedTab === "sessions" ||
      requestedTab === "resources"
    ) {
      setTab(requestedTab);
    }
  }, [requestedTab]);
  const [busy, setBusy] = useState(false);

  // Local reactive workspace state for optimistic updates without full-page reloads
  const [relationshipStatus, setRelationshipStatus] = useState(mentorship.status);
  const [summaryNote, setSummaryNote] = useState(mentorship.completionSummary);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [sessionsList, setSessionsList] = useState<SessionItem[]>(initialSessions);
  const [resourcesList, setResourcesList] = useState<ResourceItem[]>(initialResources);

  // Goals UI state
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [goalOutcome, setGoalOutcome] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");

  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});

  // Sessions state
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionStartTime, setSessionStartTime] = useState("16:00");
  const [sessionDurationMin, setSessionDurationMin] = useState("60");
  const [sessionType, setSessionType] = useState<"online" | "in_person" | "hybrid">("online");
  const [meetingLink, setMeetingLink] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [completeSessionId, setCompleteSessionId] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("both_attended");

  // Messages state
  const [messages, setMessages] = useState(initialMessages);

  // Resources state
  const [resTitle, setResTitle] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resUrl, setResUrl] = useState("");

  // Completion & Review modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState("");
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewed, setReviewed] = useState(hasSubmittedReview);

  function computeGoalProgress(milestones: Milestone[], status: string): number {
    if (milestones.length === 0) return status === "completed" ? 100 : 0;
    const completedCount = milestones.filter((m) => m.status === "completed").length;
    return Math.round((completedCount / milestones.length) * 100);
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    const tempId = `temp-goal-${Date.now()}`;
    const targetIso = goalTargetDate ? new Date(goalTargetDate).toISOString() : null;
    const optimisticGoal: Goal = {
      id: tempId,
      title: goalTitle,
      description: goalDesc,
      expectedOutcome: goalOutcome || null,
      targetDate: targetIso,
      status: "not_started",
      mentorFeedback: null,
      milestones: [],
      updates: [],
      progressPercent: 0,
    };

    const previousGoals = goals;
    setGoals((prev) => [optimisticGoal, ...prev]);
    setGoalModalOpen(false);
    setGoalTitle("");
    setGoalDesc("");
    setGoalOutcome("");
    setGoalTargetDate("");
    pushToast({ kind: "success", title: "Development goal created" });

    try {
      const res = await fetch(`/api/v1/mentorships/${mentorship.id}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: optimisticGoal.title,
          description: optimisticGoal.description,
          expectedOutcome: optimisticGoal.expectedOutcome,
          targetDate: targetIso,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { data?: { goal?: { id: string } } };
      if (json.data?.goal?.id) {
        setGoals((prev) =>
          prev.map((g) => (g.id === tempId ? { ...g, id: json.data!.goal!.id } : g)),
        );
      }
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Could not save goal. Changes reverted." });
    }
  }

  async function addMilestone(goalId: string) {
    const title = milestoneInputs[goalId]?.trim();
    if (!title) return;

    const tempId = `temp-ms-${Date.now()}`;
    const previousGoals = goals;
    setMilestoneInputs((prev) => ({ ...prev, [goalId]: "" }));
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const nextMilestones = [
          ...g.milestones,
          { id: tempId, title, description: null, dueDate: null, status: "pending", evidenceUrl: null },
        ];
        return {
          ...g,
          milestones: nextMilestones,
          progressPercent: computeGoalProgress(nextMilestones, g.status),
        };
      }),
    );
    pushToast({ kind: "success", title: "Milestone added" });

    try {
      const res = await fetch(`/api/v1/goals/${goalId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed");
      const json = (await res.json()) as { data?: { milestone?: { id: string } } };
      if (json.data?.milestone?.id) {
        setGoals((prev) =>
          prev.map((g) =>
            g.id !== goalId
              ? g
              : {
                  ...g,
                  milestones: g.milestones.map((m) =>
                    m.id === tempId ? { ...m, id: json.data!.milestone!.id } : m,
                  ),
                },
          ),
        );
      }
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Could not save milestone. Reverted." });
    }
  }

  async function toggleMilestone(goalId: string, milestone: Milestone) {
    const nextStatus = milestone.status === "completed" ? "pending" : "completed";
    const previousGoals = goals;

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const nextMilestones = g.milestones.map((m) =>
          m.id === milestone.id ? { ...m, status: nextStatus } : m,
        );
        return {
          ...g,
          milestones: nextMilestones,
          progressPercent: computeGoalProgress(nextMilestones, g.status),
        };
      }),
    );

    try {
      const res = await fetch(`/api/v1/milestones/${milestone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Unable to update milestone" });
    }
  }

  async function submitProgress(goalId: string) {
    const description = progressInputs[goalId]?.trim();
    if (!description || description.length < 5) {
      pushToast({ kind: "error", title: "Please write at least 5 characters for your update." });
      return;
    }

    const tempId = `temp-upd-${Date.now()}`;
    const previousGoals = goals;
    setProgressInputs((prev) => ({ ...prev, [goalId]: "" }));
    setGoals((prev) =>
      prev.map((g) =>
        g.id !== goalId
          ? g
          : {
              ...g,
              updates: [
                { id: tempId, description, evidenceUrl: null, createdAt: new Date().toISOString() },
                ...g.updates,
              ],
            },
      ),
    );
    pushToast({ kind: "success", title: "Progress update submitted" });

    try {
      const res = await fetch(`/api/v1/goals/${goalId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Unable to save progress update" });
    }
  }

  async function submitMentorFeedback(goalId: string) {
    const mentorFeedback = feedbackInputs[goalId]?.trim();
    if (!mentorFeedback) return;

    const previousGoals = goals;
    setFeedbackInputs((prev) => ({ ...prev, [goalId]: "" }));
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, mentorFeedback, status: "under_review" } : g,
      ),
    );
    pushToast({ kind: "success", title: "Mentor feedback saved" });

    try {
      const res = await fetch(`/api/v1/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorFeedback, status: "under_review" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Unable to save mentor feedback" });
    }
  }

  async function markGoalCompleted(goalId: string) {
    const previousGoals = goals;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, status: "completed", progressPercent: 100 } : g,
      ),
    );
    pushToast({ kind: "success", title: "Goal marked completed" });

    try {
      const res = await fetch(`/api/v1/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setGoals(previousGoals);
      pushToast({ kind: "error", title: "Unable to complete goal" });
    }
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setSessionError(null);
    const start = new Date(`${sessionDate}T${sessionStartTime}:00`);
    if (Number.isNaN(start.getTime())) {
      setSessionError("Please choose a valid date and time.");
      return;
    }
    const end = new Date(start.getTime() + Number(sessionDurationMin) * 60_000);
    const tempId = `temp-session-${Date.now()}`;
    const optimisticSession: SessionItem = {
      id: tempId,
      title: sessionTitle,
      description: null,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      meetingLink: meetingLink || null,
      sessionType,
      status: "proposed",
      attendanceStatus: "pending",
      summary: null,
    };

    const previousSessions = sessionsList;
    setSessionsList((prev) => [optimisticSession, ...prev]);
    setSessionModalOpen(false);
    setSessionTitle("");
    setMeetingLink("");
    pushToast({ kind: "success", title: "Mentorship session scheduled" });

    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorshipId: mentorship.id,
          title: optimisticSession.title,
          startTime: optimisticSession.startTime,
          endTime: optimisticSession.endTime,
          sessionType: optimisticSession.sessionType,
          meetingLink: optimisticSession.meetingLink,
        }),
      });
      const json = (await res.json()) as {
        data?: { session?: { id: string } };
        error?: { message: string };
      };
      if (!res.ok) {
        setSessionsList(previousSessions);
        pushToast({
          kind: "error",
          title: json.error?.message ?? "Unable to schedule session.",
        });
        return;
      }
      if (json.data?.session?.id) {
        setSessionsList((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: json.data!.session!.id } : s)),
        );
      }
    } catch {
      setSessionsList(previousSessions);
      pushToast({ kind: "error", title: "Network error scheduling session." });
    }
  }

  async function updateSessionStatus(
    sessionId: string,
    payload: Record<string, unknown>,
  ) {
    const previousSessions = sessionsList;
    const nextStatus = typeof payload.status === "string" ? payload.status : undefined;
    const nextSummary = typeof payload.summary === "string" ? payload.summary : undefined;

    setSessionsList((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              status: nextStatus ?? s.status,
              summary: nextSummary ?? s.summary,
            }
          : s,
      ),
    );
    setCompleteSessionId(null);
    setSessionSummary("");
    pushToast({ kind: "success", title: "Session updated" });

    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message: string } };
        setSessionsList(previousSessions);
        pushToast({ kind: "error", title: json.error?.message ?? "Failed to update session" });
      }
    } catch {
      setSessionsList(previousSessions);
      pushToast({ kind: "error", title: "Failed to update session" });
    }
  }

  async function sendMessage(content: string, attachmentUrl?: string | null): Promise<boolean> {
    const trimmed = content.trim();
    if (!conversationId || !trimmed) return false;

    const tempId = `temp-msg-${Date.now()}`;
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId,
      content: trimmed,
      attachmentUrl: attachmentUrl ?? null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          ...(attachmentUrl ? { attachmentUrl } : {}),
        }),
      });
      const json = (await res.json()) as {
        data?: { message: MessageItem };
        error?: { message: string };
      };
      if (res.ok && json.data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? json.data!.message : m)),
        );
        return true;
      }
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      pushToast({ kind: "error", title: json.error?.message ?? "Unable to send message" });
      return false;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      pushToast({ kind: "error", title: "Network error sending message" });
      return false;
    }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    const tempId = `temp-res-${Date.now()}`;
    const optimisticResource: ResourceItem = {
      id: tempId,
      title: resTitle,
      description: resDesc,
      resourceType: "link",
      externalUrl: resUrl,
      createdAt: new Date().toISOString(),
    };

    const previousResources = resourcesList;
    setResourcesList((prev) => [optimisticResource, ...prev]);
    setResTitle("");
    setResDesc("");
    setResUrl("");
    pushToast({ kind: "success", title: "Resource shared in workspace" });

    try {
      const res = await fetch("/api/v1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorshipId: mentorship.id,
          title: optimisticResource.title,
          description: optimisticResource.description,
          externalUrl: optimisticResource.externalUrl,
          resourceType: "link",
        }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setResourcesList(previousResources);
      pushToast({ kind: "error", title: "Unable to share resource" });
    }
  }

  async function updateRelationshipStatus(
    status: "active" | "paused" | "completed",
    summary?: string,
  ) {
    const prevStatus = relationshipStatus;
    const prevSummary = summaryNote;

    setRelationshipStatus(status);
    if (summary !== undefined) setSummaryNote(summary);
    setCompleteModalOpen(false);
    setPauseConfirmOpen(false);
    pushToast({ kind: "success", title: `Mentorship marked as ${status}` });

    try {
      const res = await fetch(`/api/v1/mentorships/${mentorship.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, completionSummary: summary ?? null }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setRelationshipStatus(prevStatus);
      setSummaryNote(prevSummary);
      pushToast({ kind: "error", title: "Unable to update mentorship status" });
    }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/mentorships/${mentorship.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: reviewComment,
          visibility: "private",
        }),
      });
      if (res.ok) {
        setReviewed(true);
        pushToast({ kind: "success", title: "Thank you for your mentorship feedback!" });
      }
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: CheckCircle2 },
    { id: "goals", label: `Goals (${goals.length})`, icon: Target },
    { id: "sessions", label: `Sessions (${sessionsList.length})`, icon: Calendar },
    { id: "messages", label: `Messages (${messages.length})`, icon: MessageSquare },
    { id: "resources", label: `Resources (${resourcesList.length})`, icon: BookOpen },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Workspace Header Card (hidden in focused chat view) */}
      {tab !== "messages" && (
        <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-xl font-semibold text-interlink-ink">
                Mentorship with {partner ? `${partner.firstName} ${partner.lastName}` : "Partner"}
              </h2>
              <Badge
                tone={
                  relationshipStatus === "active"
                    ? "forest"
                    : relationshipStatus === "completed"
                      ? "info"
                      : "warning"
                }
              >
                {relationshipStatus}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-interlink-muted">
              Your role: <span className="font-medium">{isMentor ? "Mentor" : "Mentee"}</span>{" "}
              &middot; Started {formatDate(mentorship.startDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {relationshipStatus === "active" && (
              <>
                <Button size="sm" variant="outline" onClick={() => setPauseConfirmOpen(true)}>
                  Pause Relationship
                </Button>
                <Button size="sm" onClick={() => setCompleteModalOpen(true)}>
                  Complete Mentorship
                </Button>
              </>
            )}
            {relationshipStatus === "paused" && (
              <Button size="sm" onClick={() => updateRelationshipStatus("active")}>
                Resume Mentorship
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-[2px] px-3.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-interlink-forest text-white"
                    : "bg-interlink-app-bg text-interlink-ink hover:bg-interlink-border/30"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </Card>
      )}

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <h3 className="font-display text-base font-semibold text-interlink-ink">
                Agreed Expectations &amp; Objectives
              </h3>
              {originRequest ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      Career Objective
                    </dt>
                    <dd className="mt-1 text-interlink-ink">{originRequest.careerObjective}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      Expected Outcome
                    </dt>
                    <dd className="mt-1 text-interlink-ink">{originRequest.expectedOutcome}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-500">
                      Planned Duration
                    </dt>
                    <dd className="mt-1 text-interlink-ink">{originRequest.preferredDuration}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-interlink-muted">
                  {mentorship.agreedExpectations ?? "Establish your initial goals and schedule."}
                </p>
              )}

              {summaryNote && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-200">
                  <p className="font-semibold">Completion Summary</p>
                  <p className="mt-1">{summaryNote}</p>
                </div>
              )}
            </Card>

            {(relationshipStatus === "completed" || sessionsList.some((s) => s.status === "completed")) &&
              !reviewed && (
                <Card>
                  <h3 className="font-display text-base font-semibold text-interlink-ink">
                    Mentorship Satisfaction &amp; Feedback
                  </h3>
                  <p className="mt-1 text-xs text-interlink-muted">
                    Feedback is stored privately to evaluate mentorship quality and outcomes.
                  </p>
                  <form onSubmit={submitReview} className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Rating (1–5)
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            className={`rounded-[2px] border p-2 ${
                              num <= rating
                                ? "border-interlink-gold bg-amber-50 text-amber-600"
                                : "border-slate-200 text-slate-400"
                            }`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <Textarea
                      label="Reflection / Feedback"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share key takeaways or private feedback..."
                      rows={3}
                    />
                    <Button type="submit" loading={busy}>
                      Submit Feedback
                    </Button>
                  </form>
                </Card>
              )}
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Card>
              <h3 className="font-display text-base font-semibold text-interlink-ink">
                Workspace Quick Actions
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-2.5">
                <Button variant="outline" onClick={() => setTab("goals")}>
                  <Target className="h-4 w-4" /> Manage Development Goals
                </Button>
                <Button variant="outline" onClick={() => setTab("sessions")}>
                  <Calendar className="h-4 w-4" /> Propose or Review Sessions
                </Button>
                <Button variant="outline" onClick={() => setTab("messages")}>
                  <MessageSquare className="h-4 w-4" /> Open Private Conversation
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* GOALS TAB */}
      {tab === "goals" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-interlink-ink">
              Mentorship Goals &amp; Milestones
            </h3>
            {relationshipStatus === "active" && (
              <Button size="sm" onClick={() => setGoalModalOpen(true)}>
                <Plus className="h-4 w-4" /> Add Goal
              </Button>
            )}
          </div>

          {goals.length === 0 ? (
            <Card>
              <p className="text-sm text-interlink-muted">
                No development goals established yet. Create your first goal and break it down
                into milestones.
              </p>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-semibold text-interlink-ink">{goal.title}</h4>
                      <Badge tone={goal.status === "completed" ? "success" : "forest"}>
                        {goal.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{goal.description}</p>
                    {goal.expectedOutcome && (
                      <p className="mt-1 text-xs text-interlink-muted">
                        Expected outcome: {goal.expectedOutcome}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-semibold text-interlink-forest">
                      {goal.progressPercent}%
                    </span>
                    <div className="mt-1 h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full bg-interlink-forest"
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Milestones */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Milestones
                  </h5>
                  <ul className="mt-2.5 space-y-2">
                    {goal.milestones.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-[2px] bg-interlink-app-bg px-3 py-2 text-xs"
                      >
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={m.status === "completed"}
                            onChange={() => toggleMilestone(goal.id, m)}
                            className="accent-interlink-forest"
                          />
                          <span
                            className={
                              m.status === "completed"
                                ? "line-through text-slate-400"
                                : "text-interlink-ink"
                            }
                          >
                            {m.title}
                          </span>
                        </label>
                        <span className="capitalize text-slate-500">{m.status}</span>
                      </li>
                    ))}
                  </ul>

                  {relationshipStatus === "active" && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Add a milestone..."
                        value={milestoneInputs[goal.id] ?? ""}
                        onChange={(e) =>
                          setMilestoneInputs((prev) => ({
                            ...prev,
                            [goal.id]: e.target.value,
                          }))
                        }
                      />
                      <Button size="sm" variant="outline" onClick={() => addMilestone(goal.id)}>
                        Add
                      </Button>
                    </div>
                  )}
                </div>

                {/* Progress updates & Mentor feedback */}
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Progress Updates
                    </h5>
                    <div className="mt-2 space-y-2">
                      {goal.updates.map((u) => (
                        <div key={u.id} className="rounded-[2px] bg-slate-50 p-2.5 text-xs">
                          <p className="text-slate-700">{u.description}</p>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(u.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {relationshipStatus === "active" && (
                      <div className="mt-2 flex gap-2">
                        <Input
                          placeholder="Submit a progress update..."
                          value={progressInputs[goal.id] ?? ""}
                          onChange={(e) =>
                            setProgressInputs((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                        />
                        <Button size="sm" onClick={() => submitProgress(goal.id)}>
                          Post
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Mentor Feedback
                    </h5>
                    {goal.mentorFeedback && (
                      <div className="mt-2 rounded-[2px] border border-interlink-forest/20 bg-interlink-forest/5 p-3 text-xs text-interlink-ink">
                        {goal.mentorFeedback}
                      </div>
                    )}
                    {isMentor && relationshipStatus === "active" && (
                      <div className="mt-2 space-y-2">
                        <Input
                          placeholder="Write review feedback..."
                          value={feedbackInputs[goal.id] ?? ""}
                          onChange={(e) =>
                            setFeedbackInputs((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => submitMentorFeedback(goal.id)}
                          >
                            Save Feedback
                          </Button>
                          {goal.status !== "completed" && (
                            <Button size="sm" onClick={() => markGoalCompleted(goal.id)}>
                              Mark Goal Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* SESSIONS TAB */}
      {tab === "sessions" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-interlink-ink">
              Scheduled Sessions
            </h3>
            {relationshipStatus === "active" && (
              <Button size="sm" onClick={() => setSessionModalOpen(true)}>
                <Plus className="h-4 w-4" /> Propose / Schedule Session
              </Button>
            )}
          </div>

          {sessionsList.length === 0 ? (
            <Card>
              <p className="text-sm text-interlink-muted">
                No sessions scheduled yet. Propose your first session to align on goals.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessionsList.map((s) => (
                <Card key={s.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-interlink-ink">{s.title}</h4>
                        <Badge
                          tone={
                            s.status === "completed"
                              ? "success"
                              : s.status === "confirmed"
                                ? "forest"
                                : s.status === "cancelled"
                                  ? "danger"
                                  : "warning"
                          }
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-interlink-muted">
                        {formatDateTime(s.startTime, s.timezone)} &ndash;{" "}
                        {formatTime(s.endTime, s.timezone)} ({s.timezone}) &middot;{" "}
                        {s.sessionType}
                      </p>
                      {s.meetingLink && (
                        <a
                          href={s.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-interlink-link hover:underline"
                        >
                          Join Meeting Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {s.summary && (
                        <p className="mt-3 rounded-[2px] bg-slate-50 p-2.5 text-xs text-slate-700">
                          <span className="font-semibold">Summary:</span> {s.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {s.status === "proposed" && isMentor && (
                        <Button
                          size="sm"
                          onClick={() => updateSessionStatus(s.id, { status: "confirmed" })}
                        >
                          Confirm Session
                        </Button>
                      )}
                      {["proposed", "confirmed", "rescheduled"].includes(s.status) && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCompleteSessionId(s.id)}
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSessionStatus(s.id, { status: "cancelled" })}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MESSAGES TAB: Focused full chat view */}
      {tab === "messages" && (
        <ConversationChatPanel
          conversationId={conversationId}
          currentUser={
            (currentUserId === mentorship.mentorId ? mentor : mentee) ?? {
              id: currentUserId,
              firstName: "You",
              lastName: "",
            }
          }
          partner={currentUserId === mentorship.mentorId ? mentee : mentor}
          mentorshipId={mentorship.id}
          mentorshipStatus={relationshipStatus}
          messages={messages}
          onSendMessage={sendMessage}
          onBack={() => setTab("overview")}
          alwaysShowBack
          className="h-[calc(100dvh-11.5rem)] min-h-[420px] lg:h-[calc(100vh-11rem)] lg:max-h-[780px]"
        />
      )}

      {/* RESOURCES TAB */}
      {tab === "resources" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-7">
            {resourcesList.length === 0 ? (
              <Card>
                <p className="text-sm text-interlink-muted">
                  No workspace resources shared yet.
                </p>
              </Card>
            ) : (
              resourcesList.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-interlink-ink">{r.title}</h4>
                      <p className="mt-1 text-xs text-interlink-muted">{r.description}</p>
                    </div>
                    <a
                      href={r.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-medium text-interlink-forest hover:underline"
                    >
                      Open Link &rarr;
                    </a>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="lg:col-span-5">
            <h4 className="font-display text-base font-semibold text-interlink-ink">
              Share Resource in Workspace
            </h4>
            <form onSubmit={addResource} className="mt-4 space-y-3">
              <Input
                label="Title"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                required
              />
              <Textarea
                label="Description"
                value={resDesc}
                onChange={(e) => setResDesc(e.target.value)}
                required
                rows={2}
              />
              <Input
                label="URL"
                type="url"
                placeholder="https://..."
                value={resUrl}
                onChange={(e) => setResUrl(e.target.value)}
                required
              />
              <Button type="submit" loading={busy} className="w-full">
                Share Resource
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE GOAL MODAL */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Create Development Goal"
        maxWidthClass="max-w-lg"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            Create Development Goal
          </h3>
          <form onSubmit={createGoal} className="mt-4 space-y-4">
            <Input
              label="Goal Title"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              required
            />
            <Textarea
              label="Description"
              value={goalDesc}
              onChange={(e) => setGoalDesc(e.target.value)}
              required
            />
            <Input
              label="Expected Outcome"
              value={goalOutcome}
              onChange={(e) => setGoalOutcome(e.target.value)}
            />
            <Input
              label="Target Date"
              type="date"
              value={goalTargetDate}
              onChange={(e) => setGoalTargetDate(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGoalModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Create Goal
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* SCHEDULE SESSION MODAL */}
      <Modal
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        title="Schedule Mentorship Session"
        maxWidthClass="max-w-lg"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            Schedule Session
          </h3>
          {sessionError && (
            <div className="mt-3">
              <ErrorAlert message={sessionError} />
            </div>
          )}
          <form onSubmit={createSession} className="mt-4 space-y-4">
            <Input
              label="Session Title"
              placeholder="e.g., Portfolio Review & Next Milestones"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
              <Input
                label="Start Time"
                type="time"
                value={sessionStartTime}
                onChange={(e) => setSessionStartTime(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Duration"
                value={sessionDurationMin}
                onChange={(e) => setSessionDurationMin(e.target.value)}
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </Select>
              <Select
                label="Format"
                value={sessionType}
                onChange={(e) =>
                  setSessionType(e.target.value as "online" | "in_person" | "hybrid")
                }
              >
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
              </Select>
            </div>
            <Input
              label="External Meeting Link (Zoom, Google Meet, Teams)"
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSessionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Schedule Session
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* COMPLETE SESSION MODAL */}
      <Modal
        open={Boolean(completeSessionId)}
        onClose={() => setCompleteSessionId(null)}
        title="Record Session Completion"
        maxWidthClass="max-w-md"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            Record Session Summary
          </h3>
          <div className="mt-4 space-y-4">
            <Select
              label="Attendance"
              value={attendanceStatus}
              onChange={(e) => setAttendanceStatus(e.target.value)}
            >
              <option value="both_attended">Both Attended</option>
              <option value="mentor_only">Mentor Only</option>
              <option value="mentee_only">Mentee Only</option>
              <option value="missed">Missed</option>
            </Select>
            <Textarea
              label="Brief Session Summary & Next Actions"
              value={sessionSummary}
              onChange={(e) => setSessionSummary(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCompleteSessionId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  completeSessionId &&
                  updateSessionStatus(completeSessionId, {
                    status: "completed",
                    attendanceStatus,
                    summary: sessionSummary,
                  })
                }
              >
                Save Completion
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* PAUSE CONFIRMATION */}
      <ConfirmDialog
        open={pauseConfirmOpen}
        onClose={() => setPauseConfirmOpen(false)}
        onConfirm={() => updateRelationshipStatus("paused")}
        title="Pause Mentorship Relationship?"
        description="Your goals, milestones, and conversation history will remain preserved until you resume."
        confirmLabel="Pause Relationship"
        loading={busy}
      />

      {/* COMPLETE MENTORSHIP MODAL */}
      <Modal
        open={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Mentorship"
        maxWidthClass="max-w-md"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <h3 className="font-display text-lg font-semibold text-interlink-ink">
            Complete Mentorship Relationship
          </h3>
          <p className="mt-1 text-xs text-interlink-muted">
            Document your outcomes before intentionally closing this mentorship. History remains
            accessible.
          </p>
          <div className="mt-4 space-y-4">
            <Textarea
              label="Completion Summary"
              placeholder="Summarize progress achieved, milestones completed, and next steps..."
              value={completionSummary}
              onChange={(e) => setCompletionSummary(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                loading={busy}
                onClick={() => updateRelationshipStatus("completed", completionSummary)}
              >
                Complete Mentorship
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
