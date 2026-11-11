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
    return apiError("Only the selected mentor can decline this request.", 403);
  }
  if (!["pending", "info_requested"].includes(reqRecord.status)) {
    return apiError(`Cannot decline a request with status '${reqRecord.status}'.`, 409);
  }

  const [updated] = await db
    .update(mentorshipRequests)
    .set({
      status: "rejected",
      mentorNotes: parsed.data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(mentorshipRequests.id, id))
    .returning();

  await db.insert(mentorshipRequestHistory).values({
    requestId: id,
    actorId: user.id,
    previousStatus: reqRecord.status,
    newStatus: "rejected",
    notes: parsed.data.notes ?? "Request declined.",
  });

  await createNotification({
    userId: reqRecord.menteeId,
    type: "request_rejected",
    title: "Mentorship Request Update",
    message: `${user.firstName} ${user.lastName} was unable to accept your request at this time.`,
    relatedEntityId: id,
    actionUrl: "/mentors",
  });

  return ok({ request: updated });
}
