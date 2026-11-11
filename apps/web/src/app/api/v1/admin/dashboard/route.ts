import { count, eq } from "drizzle-orm";
import {
  getDb,
  mentorProfiles,
  mentorshipRequests,
  mentorships,
  reports,
  sessions,
  userRoles,
  users,
  verificationRecords,
} from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  if (!isAdminRole(user.roles)) return apiError("Administrator access required.", 403);

  const db = getDb();
  const [
    totalUsers,
    mentorsCount,
    menteesCount,
    activeMentorships,
    pendingVerifications,
    pendingRequests,
    completedSessions,
    openReports,
  ] = await Promise.all([
    db.select({ total: count() }).from(users),
    db
      .select({ total: count() })
      .from(userRoles)
      .where(eq(userRoles.roleKey, "mentor")),
    db
      .select({ total: count() })
      .from(userRoles)
      .where(eq(userRoles.roleKey, "mentee")),
    db
      .select({ total: count() })
      .from(mentorships)
      .where(eq(mentorships.status, "active")),
    db
      .select({ total: count() })
      .from(mentorProfiles)
      .where(eq(mentorProfiles.verificationStatus, "registered")),
    db
      .select({ total: count() })
      .from(mentorshipRequests)
      .where(eq(mentorshipRequests.status, "pending")),
    db
      .select({ total: count() })
      .from(sessions)
      .where(eq(sessions.status, "completed")),
    db.select({ total: count() }).from(reports).where(eq(reports.status, "open")),
  ]);

  // Also return verification records count
  const [pendingVerifRecords] = await db
    .select({ total: count() })
    .from(verificationRecords)
    .where(eq(verificationRecords.status, "registered"));

  return ok({
    metrics: {
      totalUsers: Number(totalUsers[0]?.total ?? 0),
      registeredMentors: Number(mentorsCount[0]?.total ?? 0),
      registeredMentees: Number(menteesCount[0]?.total ?? 0),
      activeMentorships: Number(activeMentorships[0]?.total ?? 0),
      pendingVerifications: Number(
        pendingVerifRecords?.total ?? pendingVerifications[0]?.total ?? 0,
      ),
      pendingRequests: Number(pendingRequests[0]?.total ?? 0),
      completedSessions: Number(completedSessions[0]?.total ?? 0),
      openReports: Number(openReports[0]?.total ?? 0),
    },
  });
}
