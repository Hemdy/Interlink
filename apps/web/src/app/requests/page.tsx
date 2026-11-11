import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorshipRequests,
  users,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/Feedback";
import { RequestsClient } from "@/features/mentorships/ui/RequestsClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  if (!isDatabaseConfigured()) {
    return (
      <AppShell user={user} unreadCount={unreadCount} title="Mentorship Requests">
        <EmptyState
          title="Database unavailable"
          description="Configure DATABASE_URL to view mentorship requests."
        />
      </AppShell>
    );
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(mentorshipRequests)
    .where(
      or(
        eq(mentorshipRequests.menteeId, user.id),
        eq(mentorshipRequests.mentorId, user.id),
      ),
    )
    .orderBy(desc(mentorshipRequests.createdAt));

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.menteeId, r.mentorId])));
  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    mentee: userMap.get(r.menteeId) ?? null,
    mentor: userMap.get(r.mentorId) ?? null,
  }));

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Mentorship Requests"
      subtitle="Review incoming applications and track your sent mentorship requests"
    >
      <RequestsClient initialRequests={serialized} currentUserId={user.id} />
    </AppShell>
  );
}
