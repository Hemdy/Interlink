import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import { getDb, isDatabaseConfigured, mentorships, users } from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function MentorshipsListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const db = isDatabaseConfigured() ? getDb() : null;

  const rows = db
    ? await db
        .select()
        .from(mentorships)
        .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
        .orderBy(desc(mentorships.lastActivityAt))
    : [];

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.mentorId, r.menteeId])));
  const relatedUsers =
    db && userIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Mentorship Workspaces"
      subtitle="Your active, paused, and completed structured mentorship relationships"
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No mentorship relationships yet"
          description="Once a mentorship request is accepted, your dedicated workspace with goals, sessions, and private messaging opens here."
          action={
            <Link
              href="/mentors"
              className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
            >
              Browse Mentors
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {rows.map((m) => {
            const partnerId = m.mentorId === user.id ? m.menteeId : m.mentorId;
            const partner = userMap.get(partnerId);
            const roleLabel = m.mentorId === user.id ? "Mentee" : "Mentor";
            return (
              <Card key={m.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-interlink-muted">
                        {roleLabel}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-semibold text-interlink-ink">
                        {partner ? `${partner.firstName} ${partner.lastName}` : "Participant"}
                      </h2>
                    </div>
                    <Badge
                      tone={
                        m.status === "active"
                          ? "forest"
                          : m.status === "completed"
                            ? "info"
                            : "warning"
                      }
                    >
                      {m.status}
                    </Badge>
                  </div>

                  {m.agreedExpectations && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {m.agreedExpectations}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <span className="text-interlink-muted">
                    Started {new Date(m.startDate).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/mentorships/${m.id}`}
                    className="font-semibold text-interlink-forest hover:underline"
                  >
                    Open Workspace &rarr;
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
