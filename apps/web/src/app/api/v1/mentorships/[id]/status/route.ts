import { eq } from "drizzle-orm";
import { getDb, mentorships } from "@interlink/database";
import { updateMentorshipStatusSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
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
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid mentorship ID.", 400);

  const mentorship = await getMentorshipForParticipant(id, user.id);
  if (!mentorship) return apiError("Mentorship not found.", 404);

  const parsed = await parseBody(request, updateMentorshipStatusSchema);
  if (parsed.error) return parsed.error;

  const now = new Date();
  const [updated] = await getDb()
    .update(mentorships)
    .set({
      status: parsed.data.status,
      completionSummary: parsed.data.completionSummary ?? mentorship.completionSummary,
      endDate:
        parsed.data.status === "completed" || parsed.data.status === "terminated"
          ? now
          : mentorship.endDate,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(mentorships.id, id))
    .returning();

  const otherUserId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  if (parsed.data.status === "paused" || parsed.data.status === "completed") {
    await createNotification({
      userId: otherUserId,
      type:
        parsed.data.status === "completed"
          ? "relationship_completed"
          : "relationship_paused",
      title:
        parsed.data.status === "completed"
          ? "Mentorship Completed"
          : "Mentorship Paused",
      message: `${user.firstName} ${user.lastName} updated your mentorship status to ${parsed.data.status}.`,
      relatedEntityId: id,
      actionUrl: `/mentorships/${id}`,
    });
  }

  return ok({ mentorship: updated });
}
