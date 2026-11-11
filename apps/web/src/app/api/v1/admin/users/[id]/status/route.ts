import { eq } from "drizzle-orm";
import { authSessions, getDb, users } from "@interlink/database";
import { adminUpdateUserStatusSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid user ID.", 400);

  const parsed = await parseBody(request, adminUpdateUserStatusSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      status: users.status,
    });

  if (!updated) return apiError("User not found.", 404);

  if (parsed.data.status !== "active") {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, id));
  }

  await recordAuditLog({
    actorId: admin.id,
    action: "admin_user_status_updated",
    entityType: "user",
    entityId: id,
    metadata: { status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return ok({ user: updated });
}
