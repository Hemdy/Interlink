import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorships,
  sessions,
  users,
} from "@interlink/database";
import { formatDateTime } from "@interlink/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function SessionsPage() {
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

  const sessionRows =
    db && userMentorships.length > 0
      ? await db
          .select()
          .from(sessions)
          .where(
            inArray(
              sessions.mentorshipId,
              userMentorships.map((m) => m.id),
            ),
          )
          .orderBy(desc(sessions.startTime))
      : [];

  const partnerIds = Array.from(
    new Set(userMentorships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId))),
  );
  const partners =
    db && partnerIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : [];
  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const mentorshipMap = new Map(userMentorships.map((m) => [m.id, m]));

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Mentorship Sessions"
      subtitle="View proposed, confirmed, and completed mentorship sessions"
    >
      {sessionRows.length === 0 ? (
        <EmptyState
          title="No sessions scheduled yet"
          description="Open an active mentorship workspace to propose or confirm your next mentorship session."
          action={
            <Link
              href="/mentorships"
              className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
            >
              Go to Workspaces
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {sessionRows.map((s) => {
            const m = mentorshipMap.get(s.mentorshipId);
            const partnerId = m ? (m.mentorId === user.id ? m.menteeId : m.mentorId) : "";
            const partner = partnerMap.get(partnerId);
            return (
              <Card key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-interlink-ink">{s.title}</h2>
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
                      With {partner ? `${partner.firstName} ${partner.lastName}` : "Participant"}{" "}
                      &middot; {formatDateTime(s.startTime, s.timezone)} ({s.timezone})
                    </p>
                  </div>
                  <Link
                    href={`/mentorships/${s.mentorshipId}`}
                    className="text-xs font-semibold text-interlink-forest hover:underline"
                  >
                    Manage in Workspace &rarr;
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
