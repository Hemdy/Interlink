import { eq } from "drizzle-orm";
import { getDb, mentorshipGoals, mentorships } from "@interlink/database";
import { updateGoalSchema, uuidSchema } from "@interlink/validation";
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
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid goal ID.", 400);

  const db = getDb();
  const [goal] = await db
    .select()
    .from(mentorshipGoals)
    .where(eq(mentorshipGoals.id, id))
    .limit(1);

  if (!goal) return apiError("Goal not found.", 404);

  const mentorship = await getMentorshipForParticipant(goal.mentorshipId, user.id);
  if (!mentorship) return apiError("Forbidden.", 403);

  const parsed = await parseBody(request, updateGoalSchema);
  if (parsed.error) return parsed.error;

  const [updated] = await db
    .update(mentorshipGoals)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.expectedOutcome !== undefined
        ? { expectedOutcome: parsed.data.expectedOutcome }
        : {}),
      ...(parsed.data.targetDate !== undefined
        ? { targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.mentorFeedback !== undefined
        ? { mentorFeedback: parsed.data.mentorFeedback }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(mentorshipGoals.id, id))
    .returning();

  await db
    .update(mentorships)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(mentorships.id, mentorship.id));

  if (parsed.data.mentorFeedback && mentorship.mentorId === user.id) {
    await createNotification({
      userId: mentorship.menteeId,
      type: "mentor_feedback",
      title: "Mentor Feedback Received",
      message: `${user.firstName} left feedback on "${goal.title}".`,
      relatedEntityId: goal.id,
      actionUrl: `/mentorships/${mentorship.id}`,
    });
  }

  return ok({ goal: updated });
}
