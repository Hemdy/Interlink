import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  conversations,
  getDb,
  isDatabaseConfigured,
  mentorships,
  messages,
  users,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const db = isDatabaseConfigured() ? getDb() : null;

  const userMentorships = db
    ? await db
        .select()
        .from(mentorships)
        .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
    : [];

  const convRows =
    db && userMentorships.length > 0
      ? await db
          .select()
          .from(conversations)
          .where(
            inArray(
              conversations.mentorshipId,
              userMentorships.map((m) => m.id),
            ),
          )
          .orderBy(desc(conversations.updatedAt))
      : [];

  const partnerIds = Array.from(
    new Set(userMentorships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId))),
  );
  const partners =
    db && partnerIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : [];

  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const mentorshipMap = new Map(userMentorships.map((m) => [m.id, m]));

  const items = await Promise.all(
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
        conv,
        mentorshipStatus: m?.status ?? "active",
        partner: partnerMap.get(partnerId) ?? null,
        lastMessage: lastMessage ?? null,
      };
    }),
  );

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Messages"
      subtitle="Private conversations scoped to your active mentorship relationships"
    >
      {items.length === 0 ? (
        <EmptyState
          title="No mentorship conversations yet"
          description="Private conversations are automatically created inside each mentorship workspace when a request is accepted."
          action={
            <Link
              href="/mentors"
              className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
            >
              Discover Mentors
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.conv.id} href={`/mentorships/${item.conv.mentorshipId}`}>
              <Card className="transition-colors hover:border-interlink-forest">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-interlink-ink">
                      {item.partner
                        ? `${item.partner.firstName} ${item.partner.lastName}`
                        : "Participant"}
                    </h2>
                    <p className="mt-1 text-xs text-interlink-muted">
                      {item.lastMessage
                        ? item.lastMessage.content
                        : "No messages exchanged yet — open workspace to send a message."}
                    </p>
                  </div>
                  <Badge tone="forest">{item.mentorshipStatus}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
