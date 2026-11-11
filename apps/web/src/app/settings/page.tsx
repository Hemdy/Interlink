import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, userBlocks, users } from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsClient } from "@/features/profiles/ui/SettingsClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const blockedUsers = isDatabaseConfigured()
    ? await getDb()
        .select({
          blockedUserId: userBlocks.blockedUserId,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(userBlocks)
        .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
        .where(eq(userBlocks.blockerId, user.id))
    : [];

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Account Settings"
      subtitle="Manage credentials, email verification, privacy blocks, and account status"
    >
      <SettingsClient user={user} blockedUsers={blockedUsers} />
    </AppShell>
  );
}
