import { and, desc, eq, or } from "drizzle-orm";
import {
  conversations,
  getDb,
  goalMilestones,
  goalProgressUpdates,
  isDatabaseConfigured,
  mentorshipGoals,
  mentorshipRequests,
  mentorships,
  messages,
  resources,
  reviews,
  sessions,
  users,
} from "@interlink/database";

export async function getMentorshipForParticipant(mentorshipId: string, userId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();

  const [row] = await db
    .select()
    .from(mentorships)
    .where(
      and(
        eq(mentorships.id, mentorshipId),
        or(eq(mentorships.mentorId, userId), eq(mentorships.menteeId, userId)),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function getMentorshipWorkspaceData(mentorshipId: string, viewerId: string) {
  const mentorship = await getMentorshipForParticipant(mentorshipId, viewerId);
  if (!mentorship) return null;

  const db = getDb();

  const [mentorRows, menteeRows, requestRows, goalRows, sessionRows, conversationRows, resourceRows, reviewRows] =
    await Promise.all([
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImage: users.profileImage,
        })
        .from(users)
        .where(eq(users.id, mentorship.mentorId))
        .limit(1),
      db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImage: users.profileImage,
        })
        .from(users)
        .where(eq(users.id, mentorship.menteeId))
        .limit(1),
      db
        .select()
        .from(mentorshipRequests)
        .where(eq(mentorshipRequests.id, mentorship.requestId))
        .limit(1),
      db
        .select()
        .from(mentorshipGoals)
        .where(eq(mentorshipGoals.mentorshipId, mentorshipId))
        .orderBy(desc(mentorshipGoals.createdAt)),
      db
        .select()
        .from(sessions)
        .where(eq(sessions.mentorshipId, mentorshipId))
        .orderBy(desc(sessions.startTime)),
      db
        .select()
        .from(conversations)
        .where(eq(conversations.mentorshipId, mentorshipId))
        .limit(1),
      db
        .select()
        .from(resources)
        .where(eq(resources.mentorshipId, mentorshipId))
        .orderBy(desc(resources.createdAt)),
      db
        .select()
        .from(reviews)
        .where(eq(reviews.mentorshipId, mentorshipId)),
    ]);

  const goalsWithDetails = await Promise.all(
    goalRows.map(async (goal) => {
      const [milestones, updates] = await Promise.all([
        db
          .select()
          .from(goalMilestones)
          .where(eq(goalMilestones.goalId, goal.id)),
        db
          .select()
          .from(goalProgressUpdates)
          .where(eq(goalProgressUpdates.goalId, goal.id))
          .orderBy(desc(goalProgressUpdates.createdAt)),
      ]);
      const completedCount = milestones.filter((m) => m.status === "completed").length;
      const progressPercent =
        milestones.length > 0
          ? Math.round((completedCount / milestones.length) * 100)
          : goal.status === "completed"
            ? 100
            : 0;
      return {
        ...goal,
        milestones,
        updates,
        progressPercent,
      };
    }),
  );

  const conversation = conversationRows[0] ?? null;
  const messageRows = conversation
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(messages.createdAt)
    : [];

  return {
    mentorship,
    mentor: mentorRows[0] ?? null,
    mentee: menteeRows[0] ?? null,
    originRequest: requestRows[0] ?? null,
    goals: goalsWithDetails,
    sessions: sessionRows,
    conversation,
    messages: messageRows,
    resources: resourceRows,
    reviews: reviewRows,
  };
}
