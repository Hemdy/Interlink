import { and, eq } from "drizzle-orm";
import { getDb, savedMentors } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return apiError("Invalid mentor identifier.", 400);
  }
  if (id === user.id) {
    return apiError("You cannot save your own profile.", 400);
  }

  await getDb()
    .insert(savedMentors)
    .values({ menteeId: user.id, mentorId: id })
    .onConflictDoNothing();

  return ok({ saved: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return apiError("Invalid mentor identifier.", 400);
  }

  await getDb()
    .delete(savedMentors)
    .where(and(eq(savedMentors.menteeId, user.id), eq(savedMentors.mentorId, id)));

  return ok({ saved: false });
}
