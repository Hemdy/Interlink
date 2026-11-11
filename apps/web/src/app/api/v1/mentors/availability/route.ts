import { eq } from "drizzle-orm";
import { getDb, mentorAvailability, mentorProfiles } from "@interlink/database";
import { mentorAvailabilityUpdateSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const [profile] = await db
    .select({
      availabilityStatus: mentorProfiles.availabilityStatus,
      maximumMentees: mentorProfiles.maximumMentees,
    })
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, user.id))
    .limit(1);

  const slots = await db
    .select()
    .from(mentorAvailability)
    .where(eq(mentorAvailability.mentorId, user.id));

  return ok({
    availabilityStatus: profile?.availabilityStatus ?? "accepting",
    maximumMentees: profile?.maximumMentees ?? 3,
    slots,
  });
}

export async function PUT(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);
  if (!user.roles.includes("mentor")) {
    return apiError("Only mentors can update mentor availability.", 403);
  }

  const parsed = await parseBody(request, mentorAvailabilityUpdateSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();

  if (
    parsed.data.availabilityStatus !== undefined ||
    parsed.data.maximumMentees !== undefined
  ) {
    await db
      .update(mentorProfiles)
      .set({
        ...(parsed.data.availabilityStatus
          ? { availabilityStatus: parsed.data.availabilityStatus }
          : {}),
        ...(parsed.data.maximumMentees !== undefined
          ? { maximumMentees: parsed.data.maximumMentees }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(mentorProfiles.userId, user.id));
  }

  await db.delete(mentorAvailability).where(eq(mentorAvailability.mentorId, user.id));

  if (parsed.data.slots.length > 0) {
    await db.insert(mentorAvailability).values(
      parsed.data.slots.map((slot) => ({
        mentorId: user.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
        isActive: slot.isActive,
      })),
    );
  }

  const slots = await db
    .select()
    .from(mentorAvailability)
    .where(eq(mentorAvailability.mentorId, user.id));

  return ok({ slots });
}
