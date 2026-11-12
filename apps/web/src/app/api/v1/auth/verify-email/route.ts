import { and, eq, gt, isNull } from "drizzle-orm";
import { authTokens, getDb, users } from "@interlink/database";
import { verifyEmailSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, handleRouteError, ok, parseBody } from "@/lib/api/http";
import { generateOpaqueToken, hashToken } from "@/lib/auth/crypto";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const body = await request.clone().json().catch(() => ({}));
    const db = getDb();

    // Mode 1: Request a new verification link for the logged-in user
    if (body && typeof body === "object" && "resend" in body && body.resend === true) {
      const currentUser = await getCurrentUser();
      if (!currentUser) return apiError("Authentication required.", 401);

      const token = generateOpaqueToken();
      await db.insert(authTokens).values({
        userId: currentUser.id,
        tokenType: "email_verification",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      return ok({
        sent: true,
        ...(process.env.NODE_ENV !== "production"
          ? { devVerificationUrl: `/verify-email?token=${token}` }
          : {}),
      });
    }

    // Mode 2: Verify using token
    const parsed = await parseBody(request, verifyEmailSchema);
    if (parsed.error) return parsed.error;

    const now = new Date();
    const [tokenRecord] = await db
      .select()
      .from(authTokens)
      .where(
        and(
          eq(authTokens.tokenHash, hashToken(parsed.data.token)),
          eq(authTokens.tokenType, "email_verification"),
          isNull(authTokens.consumedAt),
          gt(authTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!tokenRecord) {
      return apiError("Verification link is invalid or has expired.", 400);
    }

    await db
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, tokenRecord.userId));

    await db
      .update(authTokens)
      .set({ consumedAt: now })
      .where(eq(authTokens.id, tokenRecord.id));

    return ok({ verified: true });
  } catch (err) {
    return handleRouteError("auth/verify-email", err);
  }
}
