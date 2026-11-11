import { eq } from "drizzle-orm";
import { getDb, mentorshipRequestHistory, mentorshipRequests } from "@interlink/database";
import { respondMentorshipRequestSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid request ID.", 400);

  const parsed = await parseBody(request, respondMentorshipRequestSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [reqRecord] = await db
    .select()
    .from(mentorshipRequests)
    .where(eq(mentorshipRequests.id, id))
    .limit(1);

  if (!reqRecord) return apiError("Mentorship request not found.", 404);
  if (reqRecord.mentorId !== user.id) {
    return apiError("Only the selected mentor can request additional information.", 403);
  }
  if (reqRecord.status !== "pending") {
    return apiError("Additional info can only be requested for pending requests.", 409);
  }

  const [updated] = await db
    .update(mentorshipRequests)
    .set({
      status: "info_requested",
      mentorNotes: parsed.data.notes ?? "Please share more details about your objectives.",
      updatedAt: new Date(),
    })
    .where(eq(mentorshipRequests.id, id))
    .returning();

  await db.insert(mentorshipRequestHistory).values({
    requestId: id,
    actorId: user.id,
    previousStatus: reqRecord.status,
    newStatus: "info_requested",
    notes: parsed.data.notes ?? "Requested additional information.",
  });

  await createNotification({
    userId: reqRecord.menteeId,
    type: "info_requested",
    title: "Additional Information Requested",
    message: `${user.firstName} ${user.lastName} requested clarification on your mentorship request.`,
    relatedEntityId: id,
    actionUrl: "/requests",
  });

  return ok({ request: updated });
}
