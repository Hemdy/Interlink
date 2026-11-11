import { and, eq } from "drizzle-orm";
import { getDb, userBlocks, users } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { z } from "zod";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

const blockSchema = z.object({
  blockedUserId: uuidSchema,
});

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const rows = await getDb()
    .select({
      blockedUserId: userBlocks.blockedUserId,
      createdAt: userBlocks.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(userBlocks)
    .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
    .where(eq(userBlocks.blockerId, user.id));

  return ok({ blocks: rows });
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, blockSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.blockedUserId === user.id) {
    return apiError("You cannot block yourself.", 400);
  }

  await getDb()
    .insert(userBlocks)
    .values({
      blockerId: user.id,
      blockedUserId: parsed.data.blockedUserId,
    })
    .onConflictDoNothing();

  return ok({ blocked: true });
}

export async function DELETE(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const blockedUserId = searchParams.get("blockedUserId") ?? "";
  if (!uuidSchema.safeParse(blockedUserId).success) {
    return apiError("Valid blockedUserId query parameter is required.", 400);
  }

  await getDb()
    .delete(userBlocks)
    .where(
      and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedUserId, blockedUserId)),
    );

  return ok({ unblocked: true });
}
