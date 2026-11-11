import { eq } from "drizzle-orm";
import { authSessions, getDb, users } from "@interlink/database";
import { accountUpdateSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser, revokeCurrentSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  return ok({ user });
}

export async function PATCH(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, accountUpdateSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const updates: Partial<typeof users.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName;
  if (parsed.data.profileImage !== undefined) updates.profileImage = parsed.data.profileImage;
  if (parsed.data.username !== undefined) {
    const normalized = parsed.data.username ? parsed.data.username.toLowerCase() : null;
    if (normalized) {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, normalized))
        .limit(1);
      if (existing && existing.id !== user.id) {
        return apiError("That username is already taken.", 409);
      }
    }
    updates.username = normalized;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning();

  return ok({
    user: {
      id: updated?.id ?? user.id,
      email: updated?.email ?? user.email,
      username: updated?.username ?? null,
      firstName: updated?.firstName ?? user.firstName,
      lastName: updated?.lastName ?? user.lastName,
      profileImage: updated?.profileImage ?? null,
    },
  });
}

export async function DELETE() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const now = new Date();
  await db
    .update(users)
    .set({
      status: "deactivated",
      deactivationRequestedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  await db
    .update(authSessions)
    .set({ revokedAt: now })
    .where(eq(authSessions.userId, user.id));

  await recordAuditLog({
    actorId: user.id,
    action: "account_deactivated",
    entityType: "user",
    entityId: user.id,
  });

  await revokeCurrentSession();
  return ok({ deactivated: true });
}
