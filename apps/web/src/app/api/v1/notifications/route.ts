import { and, desc, eq } from "drizzle-orm";
import { getDb, notifications } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const rows = await getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(60);

  return ok({ notifications: rows });
}

export async function PATCH(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const body = (await request.json().catch(() => ({}))) as {
    notificationId?: string;
    markAllRead?: boolean;
  };

  const db = getDb();
  if (body.markAllRead) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, user.id));
    return ok({ updated: true });
  }

  if (body.notificationId && uuidSchema.safeParse(body.notificationId).success) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.id, body.notificationId), eq(notifications.userId, user.id)),
      );
    return ok({ updated: true });
  }

  return apiError("Specify notificationId or markAllRead: true.", 400);
}
