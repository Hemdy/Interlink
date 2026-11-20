import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, userBlocks, users } from "@interlink/database";
import { AccountHubClient } from "@/features/profiles/ui/AccountHubClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [blockedUsers, unreadNotifications] = await Promise.all([
    isDatabaseConfigured()
      ? getDb()
          .select({
            blockedUserId: userBlocks.blockedUserId,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(userBlocks)
          .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
          .where(eq(userBlocks.blockerId, user.id))
      : Promise.resolve([]),
    getUnreadNotificationCount(user.id).catch(() => 0),
  ]);

  return (
    <AccountHubClient
      user={user}
      blockedUsers={blockedUsers}
      unreadNotifications={unreadNotifications}
    />
  );
}
