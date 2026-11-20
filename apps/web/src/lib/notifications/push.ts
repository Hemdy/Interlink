import * as webpushNamespace from "web-push";
import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import {
  getDb,
  notificationPreferences,
  pushDeliveryJobs,
  pushSubscriptions,
  type PushNotificationJobPayload,
} from "@interlink/database";
import type { NotificationType } from "@interlink/types";

const webpush =
  (webpushNamespace as unknown as { default?: typeof webpushNamespace })
    .default ?? webpushNamespace;

let vapidInitialized = false;

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

function ensureVapidConfigured(): boolean {
  if (vapidInitialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:support@interlink.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
  return true;
}

export interface UserNotificationChannels {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

export async function getUserNotificationChannels(
  userId: string,
  notificationType: NotificationType,
): Promise<UserNotificationChannels> {
  const [pref] = await getDb()
    .select({
      inAppEnabled: notificationPreferences.inAppEnabled,
      emailEnabled: notificationPreferences.emailEnabled,
      pushEnabled: notificationPreferences.pushEnabled,
    })
    .from(notificationPreferences)
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, notificationType),
      ),
    )
    .limit(1);

  return {
    inAppEnabled: pref?.inAppEnabled ?? true,
    emailEnabled: pref?.emailEnabled ?? true,
    pushEnabled: pref?.pushEnabled ?? true,
  };
}

export async function filterPushOptedInUsers(
  userIds: string[],
  notificationType: NotificationType,
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const disabledRows = await getDb()
    .select({ userId: notificationPreferences.userId })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.userId, userIds),
        eq(notificationPreferences.notificationType, notificationType),
        eq(notificationPreferences.pushEnabled, false),
      ),
    );

  const disabledSet = new Set(disabledRows.map((r) => r.userId));
  return userIds.filter((id) => !disabledSet.has(id));
}

interface DeliveryJobRow {
  id: string;
  userId: string;
  subscriptionId: string;
  payload: PushNotificationJobPayload;
  attempts: number;
  maxAttempts: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function deliverSingleJob(job: DeliveryJobRow): Promise<"sent" | "retry" | "dead"> {
  const db = getDb();
  const now = new Date();

  if (!ensureVapidConfigured()) {
    await db
      .update(pushDeliveryJobs)
      .set({
        status: "retry",
        lastError: "VAPID keys not configured on server.",
        nextAttemptAt: new Date(Date.now() + 5 * 60_000),
        updatedAt: now,
      })
      .where(eq(pushDeliveryJobs.id, job.id));
    return "retry";
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: job.endpoint,
        keys: {
          p256dh: job.p256dh,
          auth: job.auth,
        },
      },
      JSON.stringify({
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        ...job.payload,
      }),
      { TTL: 86400 },
    );

    await Promise.all([
      db
        .update(pushDeliveryJobs)
        .set({
          status: "sent",
          sentAt: now,
          attempts: job.attempts + 1,
          lastError: null,
          updatedAt: now,
        })
        .where(eq(pushDeliveryJobs.id, job.id)),
      db
        .update(pushSubscriptions)
        .set({
          lastUsedAt: now,
          failedAttempts: 0,
          lastError: null,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.id, job.subscriptionId)),
    ]);

    return "sent";
  } catch (err) {
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode?: unknown }).statusCode)
        : 0;
    const message =
      err instanceof Error ? err.message.slice(0, 500) : "Push delivery failed";
    const nextAttempts = job.attempts + 1;

    // 404 / 410 / 401 / 403 indicate expired, unsubscribed, or invalid push endpoints.
    if (statusCode === 404 || statusCode === 410 || statusCode === 401 || statusCode === 403) {
      await Promise.all([
        db
          .update(pushSubscriptions)
          .set({
            isActive: false,
            failedAttempts: sql`${pushSubscriptions.failedAttempts} + 1`,
            lastError: `HTTP ${statusCode}: ${message}`,
            updatedAt: now,
          })
          .where(eq(pushSubscriptions.id, job.subscriptionId)),
        db
          .update(pushDeliveryJobs)
          .set({
            status: "dead",
            attempts: nextAttempts,
            lastError: `HTTP ${statusCode}: ${message}`,
            updatedAt: now,
          })
          .where(eq(pushDeliveryJobs.id, job.id)),
      ]);
      return "dead";
    }

    const exhausted = nextAttempts >= job.maxAttempts;
    const backoffMinutes = Math.min(60, Math.pow(2, nextAttempts));

    await Promise.all([
      db
        .update(pushDeliveryJobs)
        .set({
          status: exhausted ? "dead" : "retry",
          attempts: nextAttempts,
          nextAttemptAt: new Date(Date.now() + backoffMinutes * 60_000),
          lastError: statusCode ? `HTTP ${statusCode}: ${message}` : message,
          updatedAt: now,
        })
        .where(eq(pushDeliveryJobs.id, job.id)),
      db
        .update(pushSubscriptions)
        .set({
          failedAttempts: sql`${pushSubscriptions.failedAttempts} + 1`,
          lastError: message,
          ...(exhausted ? { isActive: false } : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(pushSubscriptions.id, job.subscriptionId),
            sql`${pushSubscriptions.failedAttempts} < 100`,
          ),
        ),
    ]);

    return exhausted ? "dead" : "retry";
  }
}

export async function enqueueAndDispatchPush(input: {
  recipientUserIds: string[];
  notificationType: NotificationType;
  dedupeKeyBase: string;
  payload: PushNotificationJobPayload;
  immediateLimit?: number;
}): Promise<{ queued: number; sent: number; failed: number }> {
  const uniqueRecipients = Array.from(new Set(input.recipientUserIds)).filter(Boolean);
  if (uniqueRecipients.length === 0) {
    return { queued: 0, sent: 0, failed: 0 };
  }

  const eligibleUserIds = await filterPushOptedInUsers(
    uniqueRecipients,
    input.notificationType,
  );
  if (eligibleUserIds.length === 0) {
    return { queued: 0, sent: 0, failed: 0 };
  }

  const db = getDb();
  const subs = await db
    .select({
      id: pushSubscriptions.id,
      userId: pushSubscriptions.userId,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      and(
        inArray(pushSubscriptions.userId, eligibleUserIds),
        eq(pushSubscriptions.isActive, true),
      ),
    );

  if (subs.length === 0) {
    return { queued: 0, sent: 0, failed: 0 };
  }

  const inserted = await db
    .insert(pushDeliveryJobs)
    .values(
      subs.map((sub) => ({
        userId: sub.userId,
        subscriptionId: sub.id,
        notificationType: input.notificationType,
        dedupeKey: `${input.dedupeKeyBase}:${sub.id}`,
        payload: input.payload,
        status: "pending" as const,
        attempts: 0,
        maxAttempts: 4,
        nextAttemptAt: new Date(),
      })),
    )
    .onConflictDoNothing({ target: pushDeliveryJobs.dedupeKey })
    .returning({
      id: pushDeliveryJobs.id,
      userId: pushDeliveryJobs.userId,
      subscriptionId: pushDeliveryJobs.subscriptionId,
      payload: pushDeliveryJobs.payload,
      attempts: pushDeliveryJobs.attempts,
      maxAttempts: pushDeliveryJobs.maxAttempts,
    });

  if (inserted.length === 0) {
    return { queued: 0, sent: 0, failed: 0 };
  }

  const subById = new Map(subs.map((s) => [s.id, s]));
  const limit = input.immediateLimit ?? 25;
  const immediateBatch = inserted.slice(0, limit);

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    immediateBatch.map(async (job) => {
      const sub = subById.get(job.subscriptionId);
      if (!sub) return;
      const result = await deliverSingleJob({
        ...job,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      });
      if (result === "sent") sent += 1;
      else failed += 1;
    }),
  );

  return { queued: inserted.length, sent, failed };
}

export async function processDuePushJobsAndCleanup(limit = 50): Promise<{
  processed: number;
  sent: number;
  retried: number;
  dead: number;
  deactivatedSubscriptions: number;
  purgedOldJobs: number;
}> {
  const db = getDb();
  const now = new Date();

  const dueRows = await db
    .select({
      id: pushDeliveryJobs.id,
      userId: pushDeliveryJobs.userId,
      subscriptionId: pushDeliveryJobs.subscriptionId,
      payload: pushDeliveryJobs.payload,
      attempts: pushDeliveryJobs.attempts,
      maxAttempts: pushDeliveryJobs.maxAttempts,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushDeliveryJobs)
    .innerJoin(
      pushSubscriptions,
      eq(pushDeliveryJobs.subscriptionId, pushSubscriptions.id),
    )
    .where(
      and(
        eq(pushSubscriptions.isActive, true),
        or(
          eq(pushDeliveryJobs.status, "pending"),
          eq(pushDeliveryJobs.status, "retry"),
        ),
        lte(pushDeliveryJobs.nextAttemptAt, now),
      ),
    )
    .limit(limit);

  let sent = 0;
  let retried = 0;
  let dead = 0;

  for (const job of dueRows) {
    const outcome = await deliverSingleJob(job);
    if (outcome === "sent") sent += 1;
    else if (outcome === "retry") retried += 1;
    else dead += 1;
  }

  // Deactivate subscriptions that accumulated >= 5 consecutive failures
  const deactivated = await db
    .update(pushSubscriptions)
    .set({ isActive: false, updatedAt: now })
    .where(
      and(
        eq(pushSubscriptions.isActive, true),
        sql`${pushSubscriptions.failedAttempts} >= 5`,
      ),
    )
    .returning({ id: pushSubscriptions.id });

  // Clean up completed or dead delivery jobs older than 14 days
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const purgedJobs = await db
    .delete(pushDeliveryJobs)
    .where(
      and(
        or(
          eq(pushDeliveryJobs.status, "sent"),
          eq(pushDeliveryJobs.status, "dead"),
        ),
        lte(pushDeliveryJobs.updatedAt, cutoff),
      ),
    )
    .returning({ id: pushDeliveryJobs.id });

  return {
    processed: dueRows.length,
    sent,
    retried,
    dead,
    deactivatedSubscriptions: deactivated.length,
    purgedOldJobs: purgedJobs.length,
  };
}
