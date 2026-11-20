import { and, desc, eq } from "drizzle-orm";
import { getDb, pushSubscriptions } from "@interlink/database";
import { pushSubscriptionSchema } from "@interlink/validation";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getVapidPublicKey, isWebPushConfigured } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function detectPlatformFromUserAgent(ua: string): "android" | "ios" | "desktop" | "other" {
  const lower = ua.toLowerCase();
  if (lower.includes("android")) return "android";
  if (/(iphone|ipad|ipod)/.test(lower)) return "ios";
  if (/(windows|macintosh|linux|cros)/.test(lower)) return "desktop";
  return "other";
}

function buildDeviceLabel(ua: string): string {
  if (!ua) return "Browser Device";
  if (/iphone/i.test(ua)) return "iPhone PWA / Safari";
  if (/ipad/i.test(ua)) return "iPad PWA / Safari";
  if (/android/i.test(ua)) return "Android Browser / PWA";
  if (/edg/i.test(ua)) return "Microsoft Edge";
  if (/chrome/i.test(ua)) return "Google Chrome";
  if (/firefox/i.test(ua)) return "Mozilla Firefox";
  if (/safari/i.test(ua)) return "Apple Safari";
  return "Web Browser";
}

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const devices = await getDb()
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      deviceLabel: pushSubscriptions.deviceLabel,
      platform: pushSubscriptions.platform,
      isActive: pushSubscriptions.isActive,
      lastUsedAt: pushSubscriptions.lastUsedAt,
      createdAt: pushSubscriptions.createdAt,
    })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.isActive, true),
      ),
    )
    .orderBy(desc(pushSubscriptions.updatedAt));

  return ok({
    configured: isWebPushConfigured(),
    vapidPublicKey: getVapidPublicKey(),
    subscriptions: devices,
  });
}

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    if (!isWebPushConfigured()) {
      return apiError("Web Push VAPID keys are not configured on this server.", 503);
    }

    const parsed = await parseBody(request, pushSubscriptionSchema);
    if (parsed.error) return parsed.error;

    const ua = request.headers.get("user-agent") ?? "";
    const platform =
      parsed.data.platform === "other"
        ? detectPlatformFromUserAgent(ua)
        : parsed.data.platform;
    const deviceLabel =
      parsed.data.deviceLabel?.trim() || buildDeviceLabel(ua);

    const db = getDb();
    const now = new Date();
    const [subscription] = await db
      .insert(pushSubscriptions)
      .values({
        userId: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: ua || null,
        deviceLabel,
        platform,
        isActive: true,
        failedAttempts: 0,
        lastError: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: user.id,
          p256dh: parsed.data.keys.p256dh,
          auth: parsed.data.keys.auth,
          userAgent: ua || null,
          deviceLabel,
          platform,
          isActive: true,
          failedAttempts: 0,
          lastError: null,
          updatedAt: now,
        },
      })
      .returning({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        deviceLabel: pushSubscriptions.deviceLabel,
        platform: pushSubscriptions.platform,
        isActive: pushSubscriptions.isActive,
      });

    return created({ subscription });
  } catch (err) {
    return handleRouteError("notifications/push/subscribe", err);
  }
}

export async function DELETE(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { searchParams } = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as {
      endpoint?: string;
      subscriptionId?: string;
      allDevices?: boolean;
    };

    const endpoint = body.endpoint || searchParams.get("endpoint");
    const subscriptionId = body.subscriptionId || searchParams.get("subscriptionId");
    const db = getDb();

    if (body.allDevices) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(pushSubscriptions.userId, user.id));
      return ok({ unsubscribed: true, scope: "all" });
    }

    if (subscriptionId) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(pushSubscriptions.id, subscriptionId),
            eq(pushSubscriptions.userId, user.id),
          ),
        );
      return ok({ unsubscribed: true });
    }

    if (endpoint) {
      await db
        .update(pushSubscriptions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(pushSubscriptions.endpoint, endpoint),
            eq(pushSubscriptions.userId, user.id),
          ),
        );
      return ok({ unsubscribed: true });
    }

    return apiError("Provide endpoint, subscriptionId, or allDevices: true.", 400);
  } catch (err) {
    return handleRouteError("notifications/push/unsubscribe", err);
  }
}
