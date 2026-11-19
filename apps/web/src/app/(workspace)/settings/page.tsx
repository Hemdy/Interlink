import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, userBlocks, users } from "@interlink/database";
import { SettingsClient } from "@/features/profiles/ui/SettingsClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

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

  return <SettingsClient user={user} blockedUsers={blockedUsers} />;
}
