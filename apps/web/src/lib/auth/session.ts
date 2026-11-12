import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  authSessions,
  menteeProfiles,
  mentorProfiles,
  userRoles,
  users,
} from "@interlink/database";
import { ADMIN_ROLES, type SessionUser, type UserRole } from "@interlink/types";
import { generateOpaqueToken, hashToken } from "./crypto";

export const SESSION_COOKIE_NAME = "interlink_session";
const SESSION_TTL_DAYS = 14;

export function isAdminRole(roles: readonly UserRole[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

export function pickPrimaryRole(roles: readonly UserRole[]): UserRole {
  for (const adminRole of ADMIN_ROLES) {
    if (roles.includes(adminRole)) return adminRole;
  }
  if (roles.includes("mentor")) return "mentor";
  return roles[0] ?? "mentee";
}

function shouldUseSecureCookie(request?: Request): boolean {
  if (request) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    if (forwardedProto) {
      return forwardedProto.split(",")[0]?.trim() === "https";
    }
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }
  return process.env.NODE_ENV === "production";
}

export function attachSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
  request?: Request,
) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookieOnResponse(response: NextResponse, request?: Request) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
}

export async function createAuthSession(
  userId: string,
  metadata?: { userAgent?: string | null; ipAddress?: string | null; request?: Request },
): Promise<{ token: string; expiresAt: Date }> {
  const db = getDb();
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: metadata?.userAgent ?? null,
    ipAddress: metadata?.ipAddress ?? null,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(metadata?.request),
    path: "/",
    expires: expiresAt,
  });

  return { token, expiresAt };
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken && isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .update(authSessions)
        .set({ revokedAt: new Date() })
        .where(eq(authSessions.tokenHash, hashToken(rawToken)));
    } catch (err) {
      console.error("Failed to revoke session token:", err instanceof Error ? err.message : err);
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  if (!isDatabaseConfigured()) {
    return null;
  }

  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  try {

    const db = getDb();
    const now = new Date();
    const rows = await db
      .select({
        sessionId: authSessions.id,
        userId: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        status: users.status,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(authSessions)
      .innerJoin(users, eq(authSessions.userId, users.id))
      .where(
        and(
          eq(authSessions.tokenHash, hashToken(rawToken)),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .limit(1);

    const sessionRow = rows[0];
    if (!sessionRow || sessionRow.status !== "active") {
      return null;
    }

    const roleRows = await db
      .select({ roleKey: userRoles.roleKey })
      .from(userRoles)
      .where(eq(userRoles.userId, sessionRow.userId));

    const roles = roleRows.map((r) => r.roleKey);
    const primaryRole = pickPrimaryRole(roles);

    let onboardingCompleted = true;
    if (primaryRole === "mentor") {
      const [mentor] = await db
        .select({ onboardingCompleted: mentorProfiles.onboardingCompleted })
        .from(mentorProfiles)
        .where(eq(mentorProfiles.userId, sessionRow.userId))
        .limit(1);
      onboardingCompleted = mentor?.onboardingCompleted ?? false;
    } else if (primaryRole === "mentee") {
      const [mentee] = await db
        .select({ onboardingCompleted: menteeProfiles.onboardingCompleted })
        .from(menteeProfiles)
        .where(eq(menteeProfiles.userId, sessionRow.userId))
        .limit(1);
      onboardingCompleted = mentee?.onboardingCompleted ?? false;
    }

    return {
      id: sessionRow.userId,
      email: sessionRow.email,
      username: sessionRow.username,
      firstName: sessionRow.firstName,
      lastName: sessionRow.lastName,
      profileImage: sessionRow.profileImage,
      status: sessionRow.status,
      emailVerifiedAt: sessionRow.emailVerifiedAt ? sessionRow.emailVerifiedAt.toISOString() : null,
      roles,
      primaryRole,
      onboardingCompleted,
    };
  } catch (err) {
    console.error("getCurrentUser failed:", err instanceof Error ? err.message : "unknown error");
    return null;
  }
}
