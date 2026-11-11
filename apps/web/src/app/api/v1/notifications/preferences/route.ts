import { eq } from "drizzle-orm";
import { getDb, notificationPreferences } from "@interlink/database";
import { NOTIFICATION_TYPES } from "@interlink/types";
import { z } from "zod";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

const updatePrefsSchema = z.object({
  preferences: z.array(
    z.object({
      notificationType: z.enum(NOTIFICATION_TYPES),
      inAppEnabled: z.boolean(),
      emailEnabled: z.boolean(),
    }),
  ),
});

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

  const parsed = await parseBody(request, updatePrefsSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  for (const pref of parsed.data.preferences) {
    await db
      .insert(notificationPreferences)
      .values({
        userId: user.id,
        notificationType: pref.notificationType,
        inAppEnabled: pref.inAppEnabled,
        emailEnabled: pref.emailEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.notificationType,
        ],
        set: {
          inAppEnabled: pref.inAppEnabled,
          emailEnabled: pref.emailEnabled,
          updatedAt: new Date(),
        },
      });
  }

  return ok({ updated: true });
}
