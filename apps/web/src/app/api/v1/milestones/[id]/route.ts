import { eq } from "drizzle-orm";
import { getDb, goalMilestones, mentorshipGoals } from "@interlink/database";
import { updateMilestoneSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid milestone ID.", 400);

  const db = getDb();
  const [milestone] = await db
    .select()
    .from(goalMilestones)
    .where(eq(goalMilestones.id, id))
    .limit(1);

  if (!milestone) return apiError("Milestone not found.", 404);

  const [goal] = await db
    .select()
    .from(mentorshipGoals)
    .where(eq(mentorshipGoals.id, milestone.goalId))
    .limit(1);

  if (!goal) return apiError("Parent goal not found.", 404);

  const mentorship = await getMentorshipForParticipant(goal.mentorshipId, user.id);
  if (!mentorship) return apiError("Forbidden.", 403);

  const parsed = await parseBody(request, updateMilestoneSchema);
  if (parsed.error) return parsed.error;

  const [updated] = await db
    .update(goalMilestones)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      ...(parsed.data.dueDate !== undefined
        ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null }
        : {}),
      ...(parsed.data.status !== undefined
        ? {
            status: parsed.data.status,
            completedAt: parsed.data.status === "completed" ? new Date() : null,
          }
        : {}),
      ...(parsed.data.evidenceUrl !== undefined
        ? { evidenceUrl: parsed.data.evidenceUrl || null }
        : {}),
    })
    .where(eq(goalMilestones.id, id))
    .returning();

  return ok({ milestone: updated });
}
