import { eq } from "drizzle-orm";
import { getDb, mentorshipRequestHistory, mentorshipRequests } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid request ID.", 400);

  const db = getDb();
  const [reqRecord] = await db
    .select()
    .from(mentorshipRequests)
    .where(eq(mentorshipRequests.id, id))
    .limit(1);

  if (!reqRecord) return apiError("Mentorship request not found.", 404);
  if (reqRecord.menteeId !== user.id) {
    return apiError("Only the applicant mentee can withdraw this request.", 403);
  }
  if (!["pending", "info_requested"].includes(reqRecord.status)) {
    return apiError("This request can no longer be withdrawn.", 409);
  }

  const [updated] = await db
    .update(mentorshipRequests)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(mentorshipRequests.id, id))
    .returning();

  await db.insert(mentorshipRequestHistory).values({
    requestId: id,
    actorId: user.id,
    previousStatus: reqRecord.status,
    newStatus: "cancelled",
    notes: "Withdrawn by mentee.",
  });

  return ok({ request: updated });
}
