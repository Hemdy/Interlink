import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, notifications } from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { NotificationsClient } from "@/features/notifications/ui/NotificationsClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const rows = isDatabaseConfigured()
    ? await getDb()
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(60)
    : [];

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Notifications"
      subtitle="Platform activity, mentorship updates, and session reminders"
    >
      <NotificationsClient
        initialNotifications={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
