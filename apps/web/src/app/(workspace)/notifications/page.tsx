import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, notifications } from "@interlink/database";
import { NotificationsClient } from "@/features/notifications/ui/NotificationsClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const rows = isDatabaseConfigured()
    ? await getDb()
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(60)
    : [];

  return (
    <NotificationsClient
      initialNotifications={rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  );
}
