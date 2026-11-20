import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { enqueueAndDispatchPush } from "@/lib/notifications/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const result = await enqueueAndDispatchPush({
    recipientUserIds: [user.id],
    notificationType: "new_post",
    dedupeKeyBase: `test-push:${user.id}:${Date.now()}`,
    payload: {
      title: "Interlink Push Notifications Active",
      body: `Hi ${user.firstName}, real-time notifications are working on this device.`,
      url: "/dashboard",
      tag: `interlink-test-${user.id}`,
      actorName: `${user.firstName} ${user.lastName}`.trim(),
      actorAvatar: user.profileImage ?? null,
    },
  });

  if (result.queued === 0) {
    return apiError(
      "No active push subscription found or notifications for new posts are disabled.",
      400,
    );
  }

  return ok(result);
}
