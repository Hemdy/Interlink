import { eq } from "drizzle-orm";
import { authTokens, getDb, users } from "@interlink/database";
import { forgotPasswordSchema } from "@interlink/validation";
import {
  apiError,
  ensureDatabaseConfigured,
  getClientAddress,
  ok,
  parseBody,
} from "@/lib/api/http";
import { generateOpaqueToken, hashToken } from "@/lib/auth/crypto";
import { checkRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const ip = getClientAddress(request);
  const limit = checkRateLimit(`forgot:${ip}`, 8, 60_000);
  if (!limit.allowed) {
    return apiError(`Too many requests. Try again in ${limit.retryAfterSeconds}s.`, 429);
  }

  const parsed = await parseBody(request, forgotPasswordSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  let devResetUrl: string | undefined;

  if (user) {
    const token = generateOpaqueToken();
    await db.insert(authTokens).values({
      userId: user.id,
      tokenType: "password_reset",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    if (process.env.NODE_ENV !== "production") {
      devResetUrl = `/reset-password?token=${token}`;
    }
  }

  return ok({
    message:
      "If an account exists for that email address, password reset instructions have been issued.",
    ...(devResetUrl ? { devResetUrl } : {}),
  });
}
