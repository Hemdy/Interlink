import { desc, eq } from "drizzle-orm";
import { getDb, mentorshipGoals, mentorships } from "@interlink/database";
import { createGoalSchema, uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import { createNotification } from "@/lib/notifications/service";

export async function GET(
  _request: Request,
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

  const goals = await getDb()
    .select()
    .from(mentorshipGoals)
    .where(eq(mentorshipGoals.mentorshipId, id))
    .orderBy(desc(mentorshipGoals.createdAt));

  return ok({ goals });
}

export async function POST(
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
  if (mentorship.status !== "active") {
    return apiError("Goals can only be added to active mentorships.", 409);
  }

  const parsed = await parseBody(request, createGoalSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [goal] = await db
    .insert(mentorshipGoals)
    .values({
      mentorshipId: id,
      title: parsed.data.title,
      description: parsed.data.description,
      expectedOutcome: parsed.data.expectedOutcome || null,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      status: "in_progress",
      createdBy: user.id,
    })
    .returning();

  await db
    .update(mentorships)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(mentorships.id, id));

  const otherUserId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  await createNotification({
    userId: otherUserId,
    type: "goal_created",
    title: "New Development Goal Created",
    message: `${user.firstName} added a new goal: "${parsed.data.title}".`,
    relatedEntityId: goal?.id ?? id,
    actionUrl: `/mentorships/${id}`,
  });

  return created({ goal });
}
