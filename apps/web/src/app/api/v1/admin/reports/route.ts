import { desc, inArray } from "drizzle-orm";
import { getDb, reports, users } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const db = getDb();
  const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.reporterId, r.reportedUserId])),
  );
  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  return ok({
    reports: rows.map((r) => ({
      ...r,
      reporter: userMap.get(r.reporterId) ?? null,
      reportedUser: userMap.get(r.reportedUserId) ?? null,
    })),
  });
}
