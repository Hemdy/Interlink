import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  getDb,
  goalMilestones,
  isDatabaseConfigured,
  mentorshipGoals,
  mentorships,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function GoalsOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const db = isDatabaseConfigured() ? getDb() : null;

  const userMentorships = db
    ? await db
        .select()
        .from(mentorships)
        .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
    : [];

  const goalRows =
    db && userMentorships.length > 0
      ? await db
          .select()
          .from(mentorshipGoals)
          .where(
            inArray(
              mentorshipGoals.mentorshipId,
              userMentorships.map((m) => m.id),
            ),
          )
          .orderBy(desc(mentorshipGoals.updatedAt))
      : [];

  const enriched = await Promise.all(
    goalRows.map(async (goal) => {
      const milestones = db
        ? await db
            .select()
            .from(goalMilestones)
            .where(eq(goalMilestones.goalId, goal.id))
        : [];
      const done = milestones.filter((m) => m.status === "completed").length;
      const progress =
        milestones.length > 0
          ? Math.round((done / milestones.length) * 100)
          : goal.status === "completed"
            ? 100
            : 0;
      return { ...goal, milestoneCount: milestones.length, doneCount: done, progress };
    }),
  );

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Goals & Progress"
      subtitle="Development objectives and milestone completion across your mentorships"
    >
      {enriched.length === 0 ? (
        <EmptyState
          title="No development goals created yet"
          description="Open an active mentorship workspace to establish your career goals and milestones."
          action={
            <Link
              href="/mentorships"
              className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
            >
              Open Mentorship Workspaces
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {enriched.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold text-interlink-ink">{g.title}</h2>
                <Badge tone={g.status === "completed" ? "success" : "forest"}>
                  {g.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{g.description}</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-interlink-muted">
                    {g.doneCount} / {g.milestoneCount} milestones completed
                  </span>
                  <span className="font-semibold text-interlink-forest">{g.progress}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-interlink-forest"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <Link
                  href={`/mentorships/${g.mentorshipId}`}
                  className="text-xs font-semibold text-interlink-forest hover:underline"
                >
                  Open in Workspace &rarr;
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
