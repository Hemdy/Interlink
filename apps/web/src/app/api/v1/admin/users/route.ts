import { desc } from "drizzle-orm";
import { getDb, userRoles, users } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export async function GET(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  if (!isAdminRole(user.roles)) return apiError("Administrator access required.", 403);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";

  const db = getDb();
  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  const allRoles = await db.select().from(userRoles);
  const rolesByUser = new Map<string, string[]>();
  for (const r of allRoles) {
    const arr = rolesByUser.get(r.userId) ?? [];
    arr.push(r.roleKey);
    rolesByUser.set(r.userId, arr);
  }

  const enriched = userRows
    .map((u) => ({
      ...u,
      roles: rolesByUser.get(u.id) ?? [],
    }))
    .filter((u) => {
      if (!q) return true;
      return `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    });

  return ok({ users: enriched });
}
