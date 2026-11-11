import { and, desc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { getDb, mentorships, sessions, users } from "@interlink/database";
import { createSessionSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import { createNotification } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const userMentorships = await db
    .select()
    .from(mentorships)
    .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)));

  if (userMentorships.length === 0) {
    return ok({ sessions: [] });
  }

  const mentorshipIds = userMentorships.map((m) => m.id);
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(inArray(sessions.mentorshipId, mentorshipIds))
    .orderBy(desc(sessions.startTime));

  const participantIds = Array.from(
    new Set(userMentorships.flatMap((m) => [m.mentorId, m.menteeId])),
  );
  const participantUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(inArray(users.id, participantIds));

  const userMap = new Map(participantUsers.map((u) => [u.id, u]));
  const mentorshipMap = new Map(userMentorships.map((m) => [m.id, m]));

  return ok({
    sessions: sessionRows.map((s) => {
      const m = mentorshipMap.get(s.mentorshipId);
      const partnerId = m ? (m.mentorId === user.id ? m.menteeId : m.mentorId) : null;
      return {
        ...s,
        partner: partnerId ? userMap.get(partnerId) ?? null : null,
      };
    }),
  });
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, createSessionSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (end <= start) {
    return apiError("Session end time must be after start time.", 400);
  }

  const mentorship = await getMentorshipForParticipant(data.mentorshipId, user.id);
  if (!mentorship) return apiError("Mentorship not found.", 404);
  if (mentorship.status !== "active") {
    return apiError("Sessions can only be scheduled for active mentorships.", 409);
  }

  const db = getDb();

  // FR-SESSION-10: Prevent conflicting confirmed sessions for the mentor
  const mentorMentorships = await db
    .select({ id: mentorships.id })
    .from(mentorships)
    .where(eq(mentorships.mentorId, mentorship.mentorId));

  if (mentorMentorships.length > 0) {
    const mentorMentorshipIds = mentorMentorships.map((m) => m.id);
    const conflicts = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          inArray(sessions.mentorshipId, mentorMentorshipIds),
          eq(sessions.status, "confirmed"),
          lt(sessions.startTime, end),
          gt(sessions.endTime, start),
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      return apiError(
        "The mentor already has a confirmed session overlapping that time slot.",
        409,
      );
    }
  }

  const initialStatus = mentorship.mentorId === user.id ? "confirmed" : "proposed";

  const [session] = await db
    .insert(sessions)
    .values({
      mentorshipId: mentorship.id,
      proposedBy: user.id,
      title: data.title,
      description: data.description || null,
      startTime: start,
      endTime: end,
      timezone: data.timezone,
      sessionType: data.sessionType,
      meetingLink: data.meetingLink || null,
      status: initialStatus,
    })
    .returning();

  await db
    .update(mentorships)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(mentorships.id, mentorship.id));

  const recipientId =
    mentorship.mentorId === user.id ? mentorship.menteeId : mentorship.mentorId;

  await createNotification({
    userId: recipientId,
    type: "session_scheduled",
    title: initialStatus === "confirmed" ? "Session Scheduled" : "New Session Proposal",
    message: `${user.firstName} ${
      initialStatus === "confirmed" ? "scheduled" : "proposed"
    } a mentorship session: "${data.title}".`,
    relatedEntityId: session?.id ?? mentorship.id,
    actionUrl: `/mentorships/${mentorship.id}`,
  });

  return created({ session });
}
