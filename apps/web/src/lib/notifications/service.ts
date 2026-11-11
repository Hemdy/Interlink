import { getDb, auditLogs, notifications } from "@interlink/database";
import type { NotificationType } from "@interlink/types";

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string | null;
  actionUrl?: string | null;
}) {
  const db = getDb();
  await db.insert(notifications).values({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    relatedEntityId: input.relatedEntityId ?? null,
    actionUrl: input.actionUrl ?? null,
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
