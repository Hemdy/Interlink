import { and, eq, gt, isNull } from "drizzle-orm";
import { authSessions, authTokens, getDb, users } from "@interlink/database";
import { resetPasswordSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { hashPassword, hashToken } from "@/lib/auth/crypto";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const parsed = await parseBody(request, resetPasswordSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const now = new Date();
  const [record] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(parsed.data.token)),
        eq(authTokens.tokenType, "password_reset"),
        isNull(authTokens.consumedAt),
        gt(authTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!record) {
    return apiError("Password reset token is invalid or has expired.", 400);
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(parsed.data.password), updatedAt: now })
    .where(eq(users.id, record.userId));

  await db.update(authTokens).set({ consumedAt: now }).where(eq(authTokens.id, record.id));
  await db
    .update(authSessions)
    .set({ revokedAt: now })
    .where(eq(authSessions.userId, record.userId));

  return ok({ reset: true });
}
