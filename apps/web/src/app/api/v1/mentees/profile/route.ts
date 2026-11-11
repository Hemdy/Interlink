import { eq } from "drizzle-orm";
import { getDb, menteeProfiles, roles, userRoles } from "@interlink/database";
import { menteeProfileSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { calculateMenteeCompletion } from "@/features/profiles/domain/completion";
import { recordAuditLog } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const [profile] = await db
    .select()
    .from(menteeProfiles)
    .where(eq(menteeProfiles.userId, user.id))
    .limit(1);

  return ok({ profile: profile ?? null });
}

async function upsertMenteeProfile(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, menteeProfileSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  const db = getDb();

  if (!user.roles.includes("mentee")) {
    await db.insert(roles).values({ key: "mentee", label: "Mentee" }).onConflictDoNothing();
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleKey: "mentee" })
      .onConflictDoNothing();
  }

  const profileCompletion = calculateMenteeCompletion({
    education: data.education ?? null,
    currentOccupation: data.currentOccupation,
    industryInterestId: data.industryInterestId ?? null,
    careerInterests: data.careerInterests,
    careerAspirations: data.careerAspirations,
    skillsToDevelop: data.skillsToDevelop,
    currentChallenges: data.currentChallenges ?? null,
    mentorshipExpectations: data.mentorshipExpectations ?? null,
  });

  const onboardingCompleted = data.onboardingCompleted ?? profileCompletion >= 50;
  const values = {
    userId: user.id,
    education: data.education || null,
    currentOccupation: data.currentOccupation,
    industryInterestId: data.industryInterestId || null,
    careerInterests: data.careerInterests,
    careerAspirations: data.careerAspirations,
    existingSkills: data.existingSkills,
    skillsToDevelop: data.skillsToDevelop,
    currentChallenges: data.currentChallenges || null,
    mentorshipExpectations: data.mentorshipExpectations || null,
    learningObjectives: data.learningObjectives || null,
    preferredLanguage: data.preferredLanguage,
    sessionPreference: data.sessionPreference,
    location: data.location || null,
    visibility: data.visibility,
    profileCompletion,
    onboardingCompleted,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: menteeProfiles.id })
    .from(menteeProfiles)
    .where(eq(menteeProfiles.userId, user.id))
    .limit(1);

  const [saved] = existing
    ? await db
        .update(menteeProfiles)
        .set(values)
        .where(eq(menteeProfiles.userId, user.id))
        .returning()
    : await db.insert(menteeProfiles).values(values).returning();

  await recordAuditLog({
    actorId: user.id,
    action: "mentee_profile_updated",
    entityType: "mentee_profile",
    entityId: saved?.id ?? null,
    metadata: { profileCompletion, onboardingCompleted },
  });

  return ok({ profile: saved });
}

export async function POST(request: Request) {
  return upsertMenteeProfile(request);
}

export async function PATCH(request: Request) {
  return upsertMenteeProfile(request);
}
