import { eq } from "drizzle-orm";
import { getDb, notificationPreferences } from "@interlink/database";
import { updateNotificationPreferencesSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const rows = await getDb()
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  return ok({ preferences: rows });
}

export async function PUT(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, updateNotificationPreferencesSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const now = new Date();
  for (const pref of parsed.data.preferences) {
    await db
      .insert(notificationPreferences)
      .values({
        userId: user.id,
        notificationType: pref.notificationType,
        inAppEnabled: pref.inAppEnabled,
        emailEnabled: pref.emailEnabled,
        pushEnabled: pref.pushEnabled,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.notificationType,
        ],
        set: {
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
          pushEnabled: pref.pushEnabled,
          updatedAt: now,
        },
      });
  }

  return ok({ updated: true });
}
