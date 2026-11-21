import { redirect } from "next/navigation";
import { asc, desc, eq, inArray, or } from "drizzle-orm";
import {
  conversations,
  getDb,
  isDatabaseConfigured,
  mentorships,
  messages,
  users,
} from "@interlink/database";
import {
  MessagesHubClient,
  type ConversationThreadSummary,
} from "@/features/messaging/ui/MessagesHubClient";
import type { ChatMessageItem } from "@/features/messaging/ui/ConversationChatPanel";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ chat?: string; mentorship?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const resolvedParams = searchParams ? await searchParams : {};
  const requestedChatId = resolvedParams.chat?.trim() || "";
  const requestedMentorshipId = resolvedParams.mentorship?.trim() || "";

  const db = isDatabaseConfigured() ? getDb() : null;

  const userMentorships = db
    ? await db
        .select()
        .from(mentorships)
        .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
    : [];

  const partnerIds = Array.from(
    new Set(userMentorships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId))),
  );

  const [convRows, partners] = await Promise.all([
    db && userMentorships.length > 0
      ? db
          .select()
          .from(conversations)
          .where(
            inArray(
              conversations.mentorshipId,
              userMentorships.map((m) => m.id),
            ),
          )
          .orderBy(desc(conversations.updatedAt))
      : Promise.resolve([]),
    db && partnerIds.length > 0
      ? db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : Promise.resolve([]),
  ]);

  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const mentorshipMap = new Map(userMentorships.map((m) => [m.id, m]));

  const threads: ConversationThreadSummary[] = await Promise.all(
    convRows.map(async (conv) => {
      const m = mentorshipMap.get(conv.mentorshipId);
      const partnerId = m ? (m.mentorId === user.id ? m.menteeId : m.mentorId) : "";
      const [lastMessage] = db
        ? await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conv.id))
            .orderBy(desc(messages.createdAt))
            .limit(1)
        : [undefined];

      return {
        conversationId: conv.id,
        mentorshipId: conv.mentorshipId,
        mentorshipStatus: m?.status ?? "active",
        updatedAt: conv.updatedAt.toISOString(),
        partner: partnerMap.get(partnerId) ?? null,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              replyToMessageId: lastMessage.replyToMessageId ?? null,
              content: lastMessage.content,
              attachmentUrl: lastMessage.attachmentUrl,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    }),
  );

  const matchedThread =
    threads.find(
      (t) =>
        (requestedChatId && t.conversationId === requestedChatId) ||
        (requestedMentorshipId && t.mentorshipId === requestedMentorshipId),
    ) ?? threads[0];

  const initialMessagesByConversation: Record<string, ChatMessageItem[]> = {};
  if (db && matchedThread?.conversationId) {
    const initialRows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, matchedThread.conversationId))
      .orderBy(asc(messages.createdAt));

    initialMessagesByConversation[matchedThread.conversationId] = initialRows.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      replyToMessageId: m.replyToMessageId ?? null,
      content: m.content,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  return (
    <MessagesHubClient
      currentUser={{
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
      }}
      initialThreads={threads}
      initialMessagesByConversation={initialMessagesByConversation}
      initialSelectedId={matchedThread?.conversationId}
      focusedChatMode={Boolean(requestedChatId || requestedMentorshipId)}
    />
  );
}
