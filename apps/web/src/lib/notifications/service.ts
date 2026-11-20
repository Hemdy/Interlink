import { and, eq, inArray, ne } from "drizzle-orm";
import {
  getDb,
  auditLogs,
  notificationPreferences,
  notifications,
  users,
} from "@interlink/database";
import type { NotificationType } from "@interlink/types";
import {
  enqueueAndDispatchPush,
  getUserNotificationChannels,
} from "@/lib/notifications/push";

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
  dedupeKeyBase?: string;
  actorName?: string;
  actorAvatar?: string | null;
  postId?: string;
  commentId?: string;
}) {
  const db = getDb();
  const channels = await getUserNotificationChannels(input.userId, input.type);

  if (channels.inAppEnabled) {
    await db.insert(notifications).values({
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      relatedEntityId: input.relatedEntityId ?? null,
      actionUrl: input.actionUrl ?? null,
    });
  }

  if (channels.pushEnabled) {
    const dedupeBase =
      input.dedupeKeyBase ??
      `${input.type}:${input.userId}:${input.relatedEntityId ?? Date.now()}`;

    await enqueueAndDispatchPush({
      recipientUserIds: [input.userId],
      notificationType: input.type,
      dedupeKeyBase: dedupeBase,
      payload: {
        title: input.title,
        body: input.message,
        url: input.actionUrl || "/notifications",
        tag: input.relatedEntityId
          ? `${input.type}-${input.relatedEntityId}`
          : input.type,
        actorName: input.actorName,
        actorAvatar: input.actorAvatar ?? null,
        postId: input.postId,
        commentId: input.commentId,
      },
    }).catch((err) => {
      console.error("[notifications] push dispatch error:", err);
    });
  }
}

export async function broadcastNewPostNotification(input: {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string | null;
  postTitle: string;
  postType: string;
}) {
  const db = getDb();
  const recipients = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.status, "active"), ne(users.id, input.authorId)));

  if (recipients.length === 0) return;

  const title = `${input.authorName} published a new ${input.postType}`;
  const message = input.postTitle.slice(0, 140);
  const actionUrl = `/dashboard?post=${input.postId}#post-${input.postId}`;

  const recipientIds = recipients.map((r) => r.id);
  const disabledInApp = await db
    .select({ userId: notificationPreferences.userId })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.userId, recipientIds),
        eq(notificationPreferences.notificationType, "new_post"),
        eq(notificationPreferences.inAppEnabled, false),
      ),
    );
  const disabledInAppSet = new Set(disabledInApp.map((r) => r.userId));
  const inAppRecipients = recipientIds.filter((id) => !disabledInAppSet.has(id));

  if (inAppRecipients.length > 0) {
    await db.insert(notifications).values(
      inAppRecipients.map((uid) => ({
        userId: uid,
        title,
        message,
        type: "new_post" as const,
        relatedEntityId: input.postId,
        actionUrl,
      })),
    );
  }

  await enqueueAndDispatchPush({
    recipientUserIds: recipients.map((r) => r.id),
    notificationType: "new_post",
    dedupeKeyBase: `new_post:${input.postId}`,
    immediateLimit: 30,
    payload: {
      title,
      body: message,
      url: actionUrl,
      tag: `new-post-${input.postId}`,
      actorName: input.authorName,
      actorAvatar: input.authorAvatar ?? null,
      postId: input.postId,
    },
  }).catch((err) => {
    console.error("[notifications] new_post push broadcast failed:", err);
  });
}

export async function recordAuditLog(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });
}
