import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { getDb, mentorships, sessions } from "@interlink/database";
import { updateSessionSchema, uuidSchema } from "@interlink/validation";
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
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid session ID.", 400);

  const db = getDb();
  const [sessionRecord] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .limit(1);

  if (!sessionRecord) return apiError("Session not found.", 404);

  const mentorship = await getMentorshipForParticipant(sessionRecord.mentorshipId, user.id);
  if (!mentorship) return apiError("Forbidden.", 403);

  const parsed = await parseBody(request, updateSessionSchema);
  if (parsed.error) return parsed.error;

  const nextStart = parsed.data.startTime
    ? new Date(parsed.data.startTime)
    : sessionRecord.startTime;
  const nextEnd = parsed.data.endTime ? new Date(parsed.data.endTime) : sessionRecord.endTime;

  if (nextEnd <= nextStart) {
    return apiError("Session end time must be after start time.", 400);
  }

  const nextStatus = parsed.data.status ?? sessionRecord.status;

  if (nextStatus === "confirmed") {
    const mentorMentorships = await db
      .select({ id: mentorships.id })
      .from(mentorships)
      .where(eq(mentorships.mentorId, mentorship.mentorId));

    if (mentorMentorships.length > 0) {
      const conflicts = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(
          and(
            inArray(
              sessions.mentorshipId,
              mentorMentorships.map((m) => m.id),
            ),
            ne(sessions.id, id),
            eq(sessions.status, "confirmed"),
            lt(sessions.startTime, nextEnd),
            gt(sessions.endTime, nextStart),
          ),
        )
        .limit(1);

      if (conflicts.length > 0) {
        return apiError("Mentor has another confirmed session during this time.", 409);
      }
    }
  }

  const [updated] = await db
    .update(sessions)
    .set({
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description }
        : {}),
      startTime: nextStart,
      endTime: nextEnd,
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
      ...(parsed.data.sessionType !== undefined
        ? { sessionType: parsed.data.sessionType }
        : {}),
      ...(parsed.data.meetingLink !== undefined
        ? { meetingLink: parsed.data.meetingLink || null }
        : {}),
      status: nextStatus,
      ...(parsed.data.attendanceStatus !== undefined
        ? { attendanceStatus: parsed.data.attendanceStatus }
        : {}),
      ...(parsed.data.summary !== undefined ? { summary: parsed.data.summary } : {}),
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, id))
    .returning();

  const recipientId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  if (parsed.data.status) {
    const typeMap = {
      confirmed: "session_scheduled",
      rescheduled: "session_rescheduled",
      cancelled: "session_cancelled",
      completed: "session_completed",
      proposed: "session_scheduled",
      missed: "session_cancelled",
    } as const;

    await createNotification({
      userId: recipientId,
      type: typeMap[parsed.data.status],
      title: `Session ${parsed.data.status}`,
      message: `${user.firstName} updated "${sessionRecord.title}" to ${parsed.data.status}.`,
      relatedEntityId: id,
      actionUrl: `/mentorships/${mentorship.id}`,
    });
  }

  return ok({ session: updated });
}
