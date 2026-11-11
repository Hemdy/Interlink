import { eq } from "drizzle-orm";
import {
  getDb,
  mentorProfiles,
  roles,
  userRoles,
  verificationRecords,
} from "@interlink/database";
import { mentorProfileSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { calculateMentorCompletion } from "@/features/profiles/domain/completion";
import { recordAuditLog } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const [profile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, user.id))
    .limit(1);

  return ok({ profile: profile ?? null });
}

async function upsertMentorProfile(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, mentorProfileSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  const db = getDb();

  if (!user.roles.includes("mentor")) {
    await db.insert(roles).values({ key: "mentor", label: "Mentor" }).onConflictDoNothing();
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleKey: "mentor" })
      .onConflictDoNothing();
  }

  const profileCompletion = calculateMentorCompletion({
    biography: data.biography,
    currentPosition: data.currentPosition,
    organisation: data.organisation ?? null,
    industryId: data.industryId ?? null,
    yearsOfExperience: data.yearsOfExperience,
    expertiseAreas: data.expertiseAreas,
    languages: data.languages,
    mentorshipApproach: data.mentorshipApproach ?? null,
    qualifications: data.qualifications ?? null,
  });

  const onboardingCompleted = data.onboardingCompleted ?? profileCompletion >= 55;
  const now = new Date();

  const values = {
    userId: user.id,
    biography: data.biography,
    currentPosition: data.currentPosition,
    organisation: data.organisation || null,
    industryId: data.industryId || null,
    yearsOfExperience: data.yearsOfExperience,
    qualifications: data.qualifications || null,
    expertiseAreas: data.expertiseAreas,
    skills: data.skills,
    mentorshipInterests: data.mentorshipInterests,
    languages: data.languages,
    location: data.location || null,
    linkedinUrl: data.linkedinUrl || null,
    portfolioUrl: data.portfolioUrl || null,
    mentorshipApproach: data.mentorshipApproach || null,
    sessionPreference: data.sessionPreference,
    availabilityStatus: data.availabilityStatus,
    maximumMentees: data.maximumMentees,
    visibility: data.visibility,
    profileCompletion,
    onboardingCompleted,
    updatedAt: now,
  };

  const [existing] = await db
    .select({ id: mentorProfiles.id })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, user.id))
    .limit(1);

  const [saved] = existing
    ? await db
        .update(mentorProfiles)
        .set(values)
        .where(eq(mentorProfiles.userId, user.id))
        .returning()
    : await db.insert(mentorProfiles).values(values).returning();

  if (data.verificationNotes || data.linkedinUrl || data.portfolioUrl) {
    await db.insert(verificationRecords).values({
      mentorId: user.id,
      verificationType: "professional_profile",
      documentReference: data.linkedinUrl || data.portfolioUrl || null,
      supportingSummary: data.verificationNotes || data.qualifications || data.currentPosition,
      status: "registered",
    });
  }

  await recordAuditLog({
    actorId: user.id,
    action: "mentor_profile_updated",
    entityType: "mentor_profile",
    entityId: saved?.id ?? null,
    metadata: { profileCompletion, onboardingCompleted },
  });

  return ok({ profile: saved });
}

export async function POST(request: Request) {
  return upsertMentorProfile(request);
}

export async function PATCH(request: Request) {
  return upsertMentorProfile(request);
}
