import { and, eq } from "drizzle-orm";
import { getDb, reviews } from "@interlink/database";
import { createReviewSchema, uuidSchema } from "@interlink/validation";
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
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid mentorship ID.", 400);

  const mentorship = await getMentorshipForParticipant(id, user.id);
  if (!mentorship) return apiError("Mentorship not found.", 404);

  if (mentorship.status !== "completed" && mentorship.status !== "active") {
    return apiError("Reviews can only be submitted for eligible mentorships.", 409);
  }

  const parsed = await parseBody(request, createReviewSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.mentorshipId, id), eq(reviews.reviewerId, user.id)))
    .limit(1);

  if (existing) {
    return apiError("You have already submitted feedback for this mentorship.", 409);
  }

  const revieweeId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  // FR-REVIEW-11: Private mentor feedback must never appear on public profiles
  const visibility =
    mentorship.mentorId === user.id ? "private" : parsed.data.visibility;

  const [review] = await db
    .insert(reviews)
    .values({
      mentorshipId: id,
      reviewerId: user.id,
      revieweeId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      visibility,
    })
    .returning();

  return created({ review });
}
