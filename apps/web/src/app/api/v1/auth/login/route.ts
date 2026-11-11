import { eq, or } from "drizzle-orm";
import { getDb, userRoles, users } from "@interlink/database";
import { loginSchema } from "@interlink/validation";
import {
  apiError,
  ensureDatabaseConfigured,
  getClientAddress,
  ok,
  parseBody,
} from "@/lib/api/http";
import { verifyPassword } from "@/lib/auth/crypto";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createAuthSession, pickPrimaryRole } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const ip = getClientAddress(request);
  const limit = checkRateLimit(`login:${ip}`, 15, 60_000);
  if (!limit.allowed) {
    return apiError(
      `Too many sign-in attempts. Please wait ${limit.retryAfterSeconds}s and try again.`,
      429,
    );
  }

  const parsed = await parseBody(request, loginSchema);
  if (parsed.error) return parsed.error;

  const identifier = parsed.data.identifier.trim().toLowerCase();
  const db = getDb();

  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, identifier), eq(users.username, identifier)))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return apiError("Invalid email/username or password.", 401);
  }

  if (user.status === "suspended") {
    return apiError("This account has been suspended. Please contact platform support.", 403);
  }

  if (user.status === "deactivated") {
    return apiError("This account has been deactivated.", 403);
  }

  const roleRows = await db
    .select({ roleKey: userRoles.roleKey })
    .from(userRoles)
    .where(eq(userRoles.userId, user.id));

  const roles = roleRows.map((r) => r.roleKey);
  const primaryRole = pickPrimaryRole(roles);

  await createAuthSession(user.id, {
    userAgent: request.headers.get("user-agent"),
    ipAddress: ip,
  });

  await recordAuditLog({
    actorId: user.id,
    action: "user_logged_in",
    entityType: "user",
    entityId: user.id,
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      primaryRole,
    },
  });
}
