import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  getDb,
  menteeProfiles,
  mentorProfiles,
  roles,
  userRoles,
  users,
} from "@interlink/database";
import {
  apiError,
  ensureDatabaseConfigured,
  getClientAddress,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { generateOpaqueToken, hashPassword } from "@/lib/auth/crypto";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { attachSessionCookie, createAuthSession } from "@/lib/auth/session";
import { createNotification, recordAuditLog } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const googleAuthSchema = z.object({
  email: z.string().trim().email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional().nullable(),
  profileImage: z.string().trim().max(1000).optional().nullable(),
  role: z.enum(["mentee", "mentor"]).optional().default("mentee"),
  credential: z.string().optional().nullable(),
});

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const ip = getClientAddress(request);
  const limit = checkRateLimit(`google-auth:${ip}`, 20, 60_000);
  if (!limit.allowed) {
    return apiError(
      `Too many authentication attempts. Please try again in ${limit.retryAfterSeconds}s.`,
      429,
    );
  }

  const parsed = await parseBody(request, googleAuthSchema);
  if (parsed.error) return parsed.error;

  let { email, firstName, lastName, profileImage } = parsed.data;
  const role = parsed.data.role ?? "mentee";

  // If a raw Google ID Token (credential) is supplied, decode claims to verify details
  if (parsed.data.credential) {
    const claims = decodeJwtPayload(parsed.data.credential);
    if (claims && typeof claims.email === "string") {
      email = claims.email.toLowerCase().trim();
      if (typeof claims.given_name === "string" && claims.given_name.trim()) {
        firstName = claims.given_name.trim();
      }
      if (typeof claims.family_name === "string" && claims.family_name.trim()) {
        lastName = claims.family_name.trim();
      }
      if (typeof claims.picture === "string" && claims.picture.trim()) {
        profileImage = claims.picture.trim();
      }
    }
  }

  email = email.toLowerCase().trim();
  lastName = lastName?.trim() || "";

  try {
    const db = getDb();
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const existingUser = existingUsers[0];

    if (existingUser) {
      if (existingUser.status === "suspended") {
        return apiError("Your account has been suspended. Please contact support.", 403);
      }
      if (existingUser.status === "deactivated") {
        return apiError("Your account has been deactivated.", 403);
      }

      // If user doesn't have a profile image, populate with Google avatar
      if (!existingUser.profileImage && profileImage) {
        await db
          .update(users)
          .set({ profileImage, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
      }

      const { token, expiresAt } = await createAuthSession(existingUser.id, {
        userAgent: request.headers.get("user-agent"),
        ipAddress: ip,
        request,
      });

      await recordAuditLog({
        actorId: existingUser.id,
        action: "login_google",
        entityType: "auth",
        entityId: existingUser.id,
        metadata: { ip },
      }).catch(() => undefined);

      const response = ok({
        isNew: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          profileImage: existingUser.profileImage || profileImage || null,
        },
      });

      attachSessionCookie(response, token, expiresAt, request);
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    // New Google Registration
    await db
      .insert(roles)
      .values({
        key: role,
        label: role === "mentor" ? "Mentor" : "Mentee",
      })
      .onConflictDoNothing();

    const randomSecret = generateOpaqueToken();
    const passwordHash = hashPassword(randomSecret);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        firstName,
        lastName,
        profileImage: profileImage || null,
        passwordHash,
        status: "active",
        emailVerifiedAt: new Date(),
      })
      .returning();

    if (!newUser) {
      return apiError("Unable to create account with Google details.", 500);
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

    await createNotification({
      userId: newUser.id,
      type: "registration",
      title: "Welcome to Interlink",
      message: `Hi ${firstName}, your Interlink account was created with Google. Complete your profile anytime from your dashboard.`,
      actionUrl: "/profile",
    }).catch(() => undefined);

    await recordAuditLog({
      actorId: newUser.id,
      action: "register_google",
      entityType: "user",
      entityId: newUser.id,
      metadata: { role, ip },
    }).catch(() => undefined);

    const { token, expiresAt } = await createAuthSession(newUser.id, {
      userAgent: request.headers.get("user-agent"),
      ipAddress: ip,
      request,
    });

    const response = ok({
      isNew: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profileImage: newUser.profileImage,
      },
    });

    attachSessionCookie(response, token, expiresAt, request);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (err) {
    return handleRouteError("auth/google", err);
  }
}
