import { and, count, eq } from "drizzle-orm";
import {
  conversations,
  getDb,
  mentorProfiles,
  mentorshipRequestHistory,
  mentorshipRequests,
  mentorships,
} from "@interlink/database";
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
    return apiError("Only the selected mentor can accept this request.", 403);
  }
  if (!["pending", "info_requested"].includes(reqRecord.status)) {
    return apiError(`Cannot accept a request with status '${reqRecord.status}'.`, 409);
  }

  // Enforce mentor capacity
  const [mentorProfile] = await db
    .select({ maximumMentees: mentorProfiles.maximumMentees })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, user.id))
    .limit(1);

  const [activeCount] = await db
    .select({ total: count() })
    .from(mentorships)
    .where(and(eq(mentorships.mentorId, user.id), eq(mentorships.status, "active")));

  if (Number(activeCount?.total ?? 0) >= (mentorProfile?.maximumMentees ?? 3)) {
    return apiError("You have reached your configured maximum active mentee capacity.", 409);
  }

  // Prevent duplicate relationship for the same request
  const [existingForReq] = await db
    .select()
    .from(mentorships)
    .where(eq(mentorships.requestId, reqRecord.id))
    .limit(1);

  if (existingForReq) {
    return ok({ mentorship: existingForReq });
  }

  const now = new Date();
  await db
    .update(mentorshipRequests)
    .set({
      status: "accepted",
      mentorNotes: parsed.data.notes ?? reqRecord.mentorNotes,
      updatedAt: now,
    })
    .where(eq(mentorshipRequests.id, reqRecord.id));

  await db.insert(mentorshipRequestHistory).values({
    requestId: reqRecord.id,
    actorId: user.id,
    previousStatus: reqRecord.status,
    newStatus: "accepted",
    notes: parsed.data.notes ?? "Request accepted and mentorship workspace created.",
  });

  const [mentorship] = await db
    .insert(mentorships)
    .values({
      mentorId: reqRecord.mentorId,
      menteeId: reqRecord.menteeId,
      requestId: reqRecord.id,
      status: "active",
      agreedExpectations: reqRecord.expectedOutcome,
    })
    .returning();

  if (mentorship) {
    await db.insert(conversations).values({
      mentorshipId: mentorship.id,
    });
  }

  await createNotification({
    userId: reqRecord.menteeId,
    type: "request_accepted",
    title: "Mentorship Request Accepted",
    message: `${user.firstName} ${user.lastName} accepted your mentorship request. Your dedicated workspace is ready.`,
    relatedEntityId: mentorship?.id ?? reqRecord.id,
    actionUrl: mentorship ? `/mentorships/${mentorship.id}` : "/mentorships",
  });

  return ok({ mentorship });
}
