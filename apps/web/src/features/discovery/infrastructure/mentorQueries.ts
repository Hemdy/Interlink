import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  getDb,
  industries,
  isDatabaseConfigured,
  menteeProfiles,
  mentorAvailability,
  mentorProfiles,
  mentorships,
  savedMentors,
  userBlocks,
  users,
} from "@interlink/database";
import type { PublicMentorSummary } from "@interlink/types";
import { scoreMentorCompatibility } from "../domain/matching";

export interface MentorDirectoryFilters {
  q?: string;
  industryId?: string;
  expertise?: string;
  language?: string;
  sessionPreference?: string;
  availability?: string;
  minExperience?: number;
  verifiedOnly?: boolean;
  sort?: "relevant" | "experience" | "newest";
  page?: number;
  limit?: number;
  viewerUserId?: string | null;
}

export async function listPublicMentors(filters: MentorDirectoryFilters = {}): Promise<{
  mentors: PublicMentorSummary[];
  total: number;
  page: number;
  limit: number;
}> {
  if (!isDatabaseConfigured()) {
    return { mentors: [], total: 0, page: 1, limit: filters.limit ?? 12 };
  }

  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));

  const rows = await db
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImage: users.profileImage,
      currentPosition: mentorProfiles.currentPosition,
      organisation: mentorProfiles.organisation,
      industryId: mentorProfiles.industryId,
      industryName: industries.name,
      yearsOfExperience: mentorProfiles.yearsOfExperience,
      biography: mentorProfiles.biography,
      expertiseAreas: mentorProfiles.expertiseAreas,
      languages: mentorProfiles.languages,
      availabilityStatus: mentorProfiles.availabilityStatus,
      verificationStatus: mentorProfiles.verificationStatus,
      sessionPreference: mentorProfiles.sessionPreference,
      maximumMentees: mentorProfiles.maximumMentees,
      profileCompletion: mentorProfiles.profileCompletion,
      location: mentorProfiles.location,
      visibility: mentorProfiles.visibility,
      onboardingCompleted: mentorProfiles.onboardingCompleted,
      updatedAt: mentorProfiles.updatedAt,
    })
    .from(mentorProfiles)
    .innerJoin(users, eq(mentorProfiles.userId, users.id))
    .leftJoin(industries, eq(mentorProfiles.industryId, industries.id))
    .where(and(eq(users.status, "active"), eq(mentorProfiles.onboardingCompleted, true)))
    .orderBy(desc(mentorProfiles.updatedAt));

  // Active mentee count per mentor
  const activeCountsRows = await db
    .select({
      mentorId: mentorships.mentorId,
      total: count(),
    })
    .from(mentorships)
    .where(eq(mentorships.status, "active"))
    .groupBy(mentorships.mentorId);

  const activeCountMap = new Map<string, number>();
  for (const row of activeCountsRows) {
    activeCountMap.set(row.mentorId, Number(row.total));
  }

  // Saved mentors and blocked users for logged-in viewer
  const savedSet = new Set<string>();
  const blockedSet = new Set<string>();

  if (filters.viewerUserId) {
    const savedRows = await db
      .select({ mentorId: savedMentors.mentorId })
      .from(savedMentors)
      .where(eq(savedMentors.menteeId, filters.viewerUserId));
    for (const row of savedRows) savedSet.add(row.mentorId);

    const blockRows = await db
      .select({
        blockerId: userBlocks.blockerId,
        blockedUserId: userBlocks.blockedUserId,
      })
      .from(userBlocks)
      .where(inArray(userBlocks.blockerId, [filters.viewerUserId]));
    for (const row of blockRows) blockedSet.add(row.blockedUserId);
  }

  // Visibility & business rules filtering (FR-DISC-10)
  const filtered = rows
    .filter((row) => {
      if (row.visibility === "private" && row.userId !== filters.viewerUserId) return false;
      if (row.visibility === "members_only" && !filters.viewerUserId) return false;
      if (blockedSet.has(row.userId)) return false;
      if (filters.industryId && row.industryId !== filters.industryId) return false;
      if (
        filters.sessionPreference &&
        row.sessionPreference !== filters.sessionPreference &&
        row.sessionPreference !== "hybrid"
      ) {
        return false;
      }
      if (filters.availability && row.availabilityStatus !== filters.availability) return false;
      if (
        typeof filters.minExperience === "number" &&
        row.yearsOfExperience < filters.minExperience
      ) {
        return false;
      }
      if (filters.verifiedOnly && row.verificationStatus !== "verified") return false;
      if (filters.language) {
        const langLower = filters.language.toLowerCase();
        if (!row.languages.some((l) => l.toLowerCase().includes(langLower))) return false;
      }
      if (filters.expertise) {
        const expLower = filters.expertise.toLowerCase();
        if (!row.expertiseAreas.some((e) => e.toLowerCase().includes(expLower))) return false;
      }
      if (filters.q) {
        const q = filters.q.toLowerCase().trim();
        const haystack = [
          row.firstName,
          row.lastName,
          row.currentPosition,
          row.organisation ?? "",
          row.industryName ?? "",
          row.biography,
          ...row.expertiseAreas,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .map<PublicMentorSummary>((row) => ({
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      profileImage: row.profileImage,
      currentPosition: row.currentPosition,
      organisation: row.organisation,
      industryId: row.industryId,
      industryName: row.industryName,
      yearsOfExperience: row.yearsOfExperience,
      biography: row.biography,
      expertiseTags: row.expertiseAreas,
      languages: row.languages,
      availabilityStatus: row.availabilityStatus,
      verificationStatus: row.verificationStatus,
      sessionPreference: row.sessionPreference,
      maximumMentees: row.maximumMentees,
      activeMenteeCount: activeCountMap.get(row.userId) ?? 0,
      profileCompletion: row.profileCompletion,
      location: row.location,
      updatedAt: row.updatedAt.toISOString(),
      isSaved: savedSet.has(row.userId),
    }));

  if (filters.sort === "experience") {
    filtered.sort((a, b) => b.yearsOfExperience - a.yearsOfExperience);
  } else if (filters.sort === "newest") {
    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  return {
    mentors: filtered.slice(start, start + limit),
    total,
    page,
    limit,
  };
}

export async function getRecommendedMentorsForUser(
  menteeUserId: string,
  limit = 6,
): Promise<PublicMentorSummary[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();

  const [mentee] = await db
    .select()
    .from(menteeProfiles)
    .where(eq(menteeProfiles.userId, menteeUserId))
    .limit(1);

  const { mentors } = await listPublicMentors({
    availability: "accepting",
    limit: 50,
    viewerUserId: menteeUserId,
  });

  const eligible = mentors.filter(
    (m) => m.userId !== menteeUserId && m.activeMenteeCount < m.maximumMentees,
  );

  const scored = eligible.map((mentor) => {
    const { score, reasons } = scoreMentorCompatibility(
      mentor,
      mentee
        ? {
            industryInterestId: mentee.industryInterestId,
            careerInterests: mentee.careerInterests,
            skillsToDevelop: mentee.skillsToDevelop,
            careerAspirations: mentee.careerAspirations,
            preferredLanguage: mentee.preferredLanguage,
            sessionPreference: mentee.sessionPreference,
          }
        : null,
    );
    return {
      ...mentor,
      matchScore: score,
      matchReasons: reasons,
    };
  });

  scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  return scored.slice(0, limit);
}

export async function getMentorPublicDetail(mentorUserId: string, viewerUserId?: string | null) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();

  const [row] = await db
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      profileImage: users.profileImage,
      status: users.status,
      biography: mentorProfiles.biography,
      currentPosition: mentorProfiles.currentPosition,
      organisation: mentorProfiles.organisation,
      industryId: mentorProfiles.industryId,
      industryName: industries.name,
      yearsOfExperience: mentorProfiles.yearsOfExperience,
      qualifications: mentorProfiles.qualifications,
      expertiseAreas: mentorProfiles.expertiseAreas,
      skills: mentorProfiles.skills,
      mentorshipInterests: mentorProfiles.mentorshipInterests,
      languages: mentorProfiles.languages,
      location: mentorProfiles.location,
      linkedinUrl: mentorProfiles.linkedinUrl,
      portfolioUrl: mentorProfiles.portfolioUrl,
      mentorshipApproach: mentorProfiles.mentorshipApproach,
      sessionPreference: mentorProfiles.sessionPreference,
      availabilityStatus: mentorProfiles.availabilityStatus,
      maximumMentees: mentorProfiles.maximumMentees,
      verificationStatus: mentorProfiles.verificationStatus,
      visibility: mentorProfiles.visibility,
      profileCompletion: mentorProfiles.profileCompletion,
      lastVerifiedAt: mentorProfiles.lastVerifiedAt,
      updatedAt: mentorProfiles.updatedAt,
    })
    .from(mentorProfiles)
    .innerJoin(users, eq(mentorProfiles.userId, users.id))
    .leftJoin(industries, eq(mentorProfiles.industryId, industries.id))
    .where(and(eq(mentorProfiles.userId, mentorUserId), eq(users.status, "active")))
    .limit(1);

  if (!row) return null;
  if (row.visibility === "private" && row.userId !== viewerUserId) return null;
  if (row.visibility === "members_only" && !viewerUserId) return null;

  const [activeCountRow] = await db
    .select({ total: count() })
    .from(mentorships)
    .where(and(eq(mentorships.mentorId, mentorUserId), eq(mentorships.status, "active")));

  const availabilitySlots = await db
    .select()
    .from(mentorAvailability)
    .where(and(eq(mentorAvailability.mentorId, mentorUserId), eq(mentorAvailability.isActive, true)));

  let isSaved = false;
  if (viewerUserId) {
    const [saved] = await db
      .select()
      .from(savedMentors)
      .where(
        and(eq(savedMentors.menteeId, viewerUserId), eq(savedMentors.mentorId, mentorUserId)),
      )
      .limit(1);
    isSaved = Boolean(saved);
  }

  return {
    ...row,
    activeMenteeCount: Number(activeCountRow?.total ?? 0),
    availabilitySlots,
    isSaved,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
