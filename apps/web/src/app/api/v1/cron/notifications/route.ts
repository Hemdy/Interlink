import { timingSafeEqual } from "node:crypto";
import { lt } from "drizzle-orm";
import { authSessions, authTokens, getDb } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, handleRouteError, ok } from "@/lib/api/http";
import { processDuePushJobsAndCleanup } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request): boolean {
  const configuredSecret = process.env.CRON_SECRET?.trim();
  if (!configuredSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerToken = request.headers.get("x-cron-secret")?.trim() ?? "";
  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get("secret")?.trim() ?? "";

  const candidate = bearerToken || headerToken || queryToken;
  if (!candidate) return false;

  const expectedBuf = Buffer.from(configuredSecret, "utf8");
  const candidateBuf = Buffer.from(candidate, "utf8");
  if (expectedBuf.length !== candidateBuf.length) return false;
  return timingSafeEqual(expectedBuf, candidateBuf);
}

async function handleCronExecution(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    if (!process.env.CRON_SECRET?.trim()) {
      return apiError("CRON_SECRET is not configured.", 503);
    }

    if (!isAuthorizedCronRequest(request)) {
      return apiError("Unauthorized cron request.", 401);
    }

    const pushSummary = await processDuePushJobsAndCleanup(75);

    // Clean up expired auth sessions and consumed/expired tokens older than 30 days
    const cleanupCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const db = getDb();
    const [expiredSessions, expiredTokens] = await Promise.all([
      db
        .delete(authSessions)
        .where(lt(authSessions.expiresAt, cleanupCutoff))
        .returning({ id: authSessions.id }),
      db
        .delete(authTokens)
        .where(lt(authTokens.expiresAt, cleanupCutoff))
        .returning({ id: authTokens.id }),
    ]);

    return ok({
      ...pushSummary,
      purgedExpiredSessions: expiredSessions.length,
      purgedExpiredTokens: expiredTokens.length,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleRouteError("cron/notifications", err);
  }
}

export async function GET(request: Request) {
  return handleCronExecution(request);
}

export async function POST(request: Request) {
  return handleCronExecution(request);
}
