import { desc, eq, inArray, or } from "drizzle-orm";
import { getDb, mentorships, users } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const rows = await db
    .select()
    .from(mentorships)
    .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
    .orderBy(desc(mentorships.lastActivityAt));

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.mentorId, r.menteeId])));
  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  return ok({
    mentorships: rows.map((row) => ({
      ...row,
      mentor: userMap.get(row.mentorId) ?? null,
      mentee: userMap.get(row.menteeId) ?? null,
    })),
  });
}
