import { eq } from "drizzle-orm";
import { getDb, goalMilestones, mentorshipGoals } from "@interlink/database";
import { createMilestoneSchema, uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";

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

  const parsed = await parseBody(request, createMilestoneSchema);
  if (parsed.error) return parsed.error;

  const [milestone] = await db
    .insert(goalMilestones)
    .values({
      goalId: id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      status: "pending",
    })
    .returning();

  return created({ milestone });
}
