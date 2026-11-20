import { redirect } from "next/navigation";
import { desc, eq, inArray, or } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorshipRequests,
  mentorshipTransactions,
  users,
} from "@interlink/database";
import { EmptyState } from "@/components/ui/Feedback";
import { RequestsClient } from "@/features/mentorships/ui/RequestsClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  if (!isDatabaseConfigured()) {
    return (
      <EmptyState
        title="Database unavailable"
        description="Configure DATABASE_URL to view mentorship requests."
      />
    );
  }

  const db = getDb();
  const [rows, txRows] = await Promise.all([
    db
      .select()
      .from(mentorshipRequests)
      .where(
        or(
          eq(mentorshipRequests.menteeId, user.id),
          eq(mentorshipRequests.mentorId, user.id),
        ),
      )
      .orderBy(desc(mentorshipRequests.createdAt)),
    db
      .select()
      .from(mentorshipTransactions)
      .where(
        or(
          eq(mentorshipTransactions.menteeId, user.id),
          eq(mentorshipTransactions.mentorId, user.id),
        ),
      )
      .orderBy(desc(mentorshipTransactions.createdAt)),
  ]);

  const userIds = Array.from(
    new Set([
      ...rows.flatMap((r) => [r.menteeId, r.mentorId]),
      ...txRows.flatMap((t) => [t.menteeId, t.mentorId]),
    ]),
  );
  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    mentee: userMap.get(r.menteeId) ?? null,
    mentor: userMap.get(r.mentorId) ?? null,
  }));

  const serializedTransactions = txRows.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    settledAt: t.settledAt ? t.settledAt.toISOString() : null,
    mentor: userMap.get(t.mentorId) ?? null,
    mentee: userMap.get(t.menteeId) ?? null,
  }));

  return (
    <RequestsClient
      initialRequests={serialized}
      initialTransactions={serializedTransactions}
      currentUserId={user.id}
    />
  );
}
