import { and, count, eq, inArray } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorProfiles,
  mentorships,
  sessions,
  users,
} from "@interlink/database";

export interface PlatformTrustMetrics {
  hasLiveMetrics: boolean;
  verifiedMentors: number;
  activeMembers: number;
  mentorshipConnections: number;
  completedSessions: number;
}

export async function getPlatformTrustMetrics(): Promise<PlatformTrustMetrics> {
  if (!isDatabaseConfigured()) {
    return {
      hasLiveMetrics: false,
      verifiedMentors: 0,
      activeMembers: 0,
      mentorshipConnections: 0,
      completedSessions: 0,
    };
  }

  try {
    const db = getDb();
    const [[verifiedRow], [membersRow], [connectionsRow], [sessionsRow]] = await Promise.all([
      db
        .select({ total: count() })
        .from(mentorProfiles)
        .where(eq(mentorProfiles.verificationStatus, "verified")),
      db
        .select({ total: count() })
        .from(users)
        .where(eq(users.status, "active")),
      db
        .select({ total: count() })
        .from(mentorships)
        .where(inArray(mentorships.status, ["active", "completed"])),
      db
        .select({ total: count() })
        .from(sessions)
        .where(and(eq(sessions.status, "completed"))),
    ]);

    const verifiedMentors = Number(verifiedRow?.total ?? 0);
    const activeMembers = Number(membersRow?.total ?? 0);
    const mentorshipConnections = Number(connectionsRow?.total ?? 0);
    const completedSessions = Number(sessionsRow?.total ?? 0);

    return {
      hasLiveMetrics:
        verifiedMentors > 0 ||
        activeMembers > 0 ||
        mentorshipConnections > 0 ||
        completedSessions > 0,
      verifiedMentors,
      activeMembers,
      mentorshipConnections,
      completedSessions,
    };
  } catch {
    return {
      hasLiveMetrics: false,
      verifiedMentors: 0,
      activeMembers: 0,
      mentorshipConnections: 0,
      completedSessions: 0,
    };
  }
}
