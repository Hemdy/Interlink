import { and, eq } from "drizzle-orm";
import { getDb, mentorReels } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, handleRouteError, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return apiError("Invalid video reel ID.", 400);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: mentorReels.id, mentorId: mentorReels.mentorId })
      .from(mentorReels)
      .where(eq(mentorReels.id, id))
      .limit(1);

    if (!existing) return apiError("Video reel not found.", 404);
    if (existing.mentorId !== user.id) {
      return apiError("You can only delete videos you published.", 403);
    }

    await db
      .delete(mentorReels)
      .where(and(eq(mentorReels.id, id), eq(mentorReels.mentorId, user.id)));

    return ok({ deleted: true });
  } catch (err) {
    return handleRouteError("reels/[id]/DELETE", err);
  }
}
