import { eq } from "drizzle-orm";
import {
  authTokens,
  getDb,
  menteeProfiles,
  mentorProfiles,
  roles,
  userRoles,
  users,
} from "@interlink/database";
import { registerSchema } from "@interlink/validation";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  getClientAddress,
  handleRouteError,
  parseBody,
} from "@/lib/api/http";
import { generateOpaqueToken, hashPassword, hashToken } from "@/lib/auth/crypto";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { attachSessionCookie, createAuthSession } from "@/lib/auth/session";
import { createNotification, recordAuditLog } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const ip = getClientAddress(request);
  const limit = checkRateLimit(`register:${ip}`, 10, 60_000);
  if (!limit.allowed) {
    return apiError(
      `Too many registration attempts. Please try again in ${limit.retryAfterSeconds}s.`,
      429,
    );
  }

  const parsed = await parseBody(request, registerSchema);
  if (parsed.error) return parsed.error;

  const { firstName, lastName, email, password, role: rawRole } = parsed.data;
  const role = rawRole ?? "mentee";

  try {
    const db = getDb();

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return apiError("An account with this email address already exists.", 409);
    }

    // Ensure the role catalogue row exists even if seed hasn't been run yet
    await db
      .insert(roles)
      .values({
        key: role,
        label: role === "mentor" ? "Mentor" : "Mentee",
      })
      .onConflictDoNothing();

    const passwordHash = hashPassword(password);
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        firstName,
        lastName,
        passwordHash,
        status: "active",
      })
      .returning();

    if (!newUser) {
      return apiError("Unable to create user account.", 500);
    }

    await db.insert(userRoles).values({
      userId: newUser.id,
      roleKey: role,
    });

    if (role === "mentor") {
      await db.insert(mentorProfiles).values({ userId: newUser.id });
    } else {
      await db.insert(menteeProfiles).values({ userId: newUser.id });
    }

    const verificationToken = generateOpaqueToken();
    await db.insert(authTokens).values({
      userId: newUser.id,
      tokenType: "email_verification",
      tokenHash: hashToken(verificationToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const { token, expiresAt } = await createAuthSession(newUser.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: ip,
      request,
    });

    try {
      await createNotification({
        userId: newUser.id,
        type: "registration",
        title: "Welcome to Interlink",
        message:
          "Complete your profile onboarding and verify your email address to unlock full mentorship features.",
        actionUrl: "/onboarding",
      });

      await recordAuditLog({
        actorId: newUser.id,
        action: "user_registered",
        entityType: "user",
        entityId: newUser.id,
        metadata: { role },
      });
    } catch (sideEffectErr) {
      console.error(
        "Non-blocking registration side effect failed:",
        sideEffectErr instanceof Error ? sideEffectErr.message : sideEffectErr,
      );
    }

    const response = created({
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        roles: [role],
        primaryRole: role,
        onboardingCompleted: false,
      },
      ...(process.env.NODE_ENV !== "production"
        ? { devVerificationUrl: `/verify-email?token=${verificationToken}` }
        : {}),
    });
    response.headers.set("Cache-Control", "no-store");
    attachSessionCookie(response, token, expiresAt, request);
    return response;
  } catch (err) {
    return handleRouteError("auth/register", err);
  }
}
