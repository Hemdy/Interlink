import { desc, eq, inArray, or } from "drizzle-orm";
import { conversations, getDb, mentorships, messages, users } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const userMentorships = await db
    .select()
    .from(mentorships)
    .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)));

  if (userMentorships.length === 0) {
    return ok({ conversations: [] });
  }

  const convRows = await db
    .select()
    .from(conversations)
    .where(
      inArray(
        conversations.mentorshipId,
        userMentorships.map((m) => m.id),
      ),
    )
    .orderBy(desc(conversations.updatedAt));

  const partnerIds = Array.from(
    new Set(
      userMentorships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId)),
    ),
  );
  const partners =
    partnerIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : [];

  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const mentorshipMap = new Map(userMentorships.map((m) => [m.id, m]));

  const items = await Promise.all(
    convRows.map(async (conv) => {
      const m = mentorshipMap.get(conv.mentorshipId);
      const partnerId = m ? (m.mentorId === user.id ? m.menteeId : m.mentorId) : "";
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);
      return {
        ...conv,
        mentorshipStatus: m?.status ?? "active",
        partner: partnerMap.get(partnerId) ?? null,
        lastMessage: lastMessage ?? null,
      };
    }),
  );

  return ok({ conversations: items });
}
