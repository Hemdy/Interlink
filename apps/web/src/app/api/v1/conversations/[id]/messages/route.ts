import { and, asc, eq, ne, or } from "drizzle-orm";
import {
  conversations,
  getDb,
  mentorships,
  messages,
  userBlocks,
} from "@interlink/database";
import { sendMessageSchema, uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import { createNotification } from "@/lib/notifications/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid conversation ID.", 400);

  const db = getDb();
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return apiError("Conversation not found.", 404);

  const mentorship = await getMentorshipForParticipant(conv.mentorshipId, user.id);
  if (!mentorship) return apiError("Forbidden.", 403);

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  // Mark incoming unread messages as read
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.conversationId, id), ne(messages.senderId, user.id)));

  return ok({ messages: msgRows });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid conversation ID.", 400);

  const db = getDb();
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return apiError("Conversation not found.", 404);

  const mentorship = await getMentorshipForParticipant(conv.mentorshipId, user.id);
  if (!mentorship) return apiError("Forbidden.", 403);

  if (mentorship.status === "terminated") {
    return apiError("Cannot send messages in a terminated mentorship.", 409);
  }

  const otherUserId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  const [blocked] = await db
    .select()
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedUserId, otherUserId)),
        and(eq(userBlocks.blockerId, otherUserId), eq(userBlocks.blockedUserId, user.id)),
      ),
    )
    .limit(1);

  if (blocked) {
    return apiError("Messaging is disabled because one participant has blocked the other.", 403);
  }

  const parsed = await parseBody(request, sendMessageSchema);
  if (parsed.error) return parsed.error;

  const now = new Date();
  const [msg] = await db
    .insert(messages)
    .values({
      conversationId: id,
      senderId: user.id,
      content: parsed.data.content,
      attachmentUrl: parsed.data.attachmentUrl || null,
    })
    .returning();

  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, id));
  await db
    .update(mentorships)
    .set({ lastActivityAt: now, updatedAt: now })
    .where(eq(mentorships.id, mentorship.id));

  await createNotification({
    userId: otherUserId,
    type: "new_message",
    title: `New message from ${user.firstName}`,
    message:
      parsed.data.content.length > 90
        ? `${parsed.data.content.slice(0, 90)}...`
        : parsed.data.content,
    relatedEntityId: mentorship.id,
    actionUrl: `/mentorships/${mentorship.id}`,
  });

  return created({ message: msg });
}
