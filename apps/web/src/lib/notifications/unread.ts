import { cache } from "react";
import { and, count, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, notifications } from "@interlink/database";

export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  if (!isDatabaseConfigured()) return 0;
  try {
    const [row] = await getDb()
      .select({ total: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(row?.total ?? 0);
  } catch {
    return 0;
  }
});
