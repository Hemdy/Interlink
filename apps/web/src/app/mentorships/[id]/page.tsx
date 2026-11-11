import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getMentorshipWorkspaceData } from "@/features/mentorships/infrastructure/mentorshipQueries";
import { MentorshipWorkspaceClient } from "@/features/mentorships/ui/MentorshipWorkspaceClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function MentorshipWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const [workspace, unreadCount] = await Promise.all([
    getMentorshipWorkspaceData(id, user.id),
    getUnreadNotificationCount(user.id),
  ]);

  if (!workspace) {
    notFound();
  }

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Mentorship Workspace"
      subtitle="Structured goals, scheduled sessions, shared resources, and private messaging"
    >
      <MentorshipWorkspaceClient
        currentUserId={user.id}
        mentorship={{
          id: workspace.mentorship.id,
          mentorId: workspace.mentorship.mentorId,
          menteeId: workspace.mentorship.menteeId,
          status: workspace.mentorship.status,
          agreedExpectations: workspace.mentorship.agreedExpectations,
          completionSummary: workspace.mentorship.completionSummary,
          startDate: workspace.mentorship.startDate.toISOString(),
        }}
        mentor={workspace.mentor}
        mentee={workspace.mentee}
        originRequest={workspace.originRequest}
        initialGoals={workspace.goals.map((g) => ({
          ...g,
          targetDate: g.targetDate ? g.targetDate.toISOString() : null,
          milestones: g.milestones.map((m) => ({
            ...m,
            dueDate: m.dueDate ? m.dueDate.toISOString() : null,
          })),
          updates: g.updates.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          })),
        }))}
        initialSessions={workspace.sessions.map((s) => ({
          ...s,
          startTime: s.startTime.toISOString(),
          endTime: s.endTime.toISOString(),
        }))}
        conversationId={workspace.conversation?.id ?? null}
        initialMessages={workspace.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        initialResources={workspace.resources.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
        hasSubmittedReview={workspace.reviews.some((r) => r.reviewerId === user.id)}
      />
    </AppShell>
  );
}
