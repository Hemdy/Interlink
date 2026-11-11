import { eq } from "drizzle-orm";
import { getDb, goalProgressUpdates, mentorshipGoals } from "@interlink/database";
import { createProgressUpdateSchema, uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import { createNotification } from "@/lib/notifications/service";

export async function POST(
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

  const parsed = await parseBody(request, createProgressUpdateSchema);
  if (parsed.error) return parsed.error;

  const [update] = await db
    .insert(goalProgressUpdates)
    .values({
      goalId: id,
      milestoneId: parsed.data.milestoneId ?? null,
      submittedBy: user.id,
      description: parsed.data.description,
      evidenceUrl: parsed.data.evidenceUrl || null,
    })
    .returning();

  await db
    .update(mentorshipGoals)
    .set({ status: "submitted_for_review", updatedAt: new Date() })
    .where(eq(mentorshipGoals.id, id));

  const recipientId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  await createNotification({
    userId: recipientId,
    type: "progress_submitted",
    title: "Goal Progress Submitted",
    message: `${user.firstName} posted a progress update on "${goal.title}".`,
    relatedEntityId: goal.id,
    actionUrl: `/mentorships/${mentorship.id}`,
  });

  return created({ update });
}
