import { desc, eq } from "drizzle-orm";
import { getDb, mentorProfiles, users, verificationRecords } from "@interlink/database";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const db = getDb();
  const rows = await db
    .select({
      id: verificationRecords.id,
      mentorId: verificationRecords.mentorId,
      verificationType: verificationRecords.verificationType,
      documentReference: verificationRecords.documentReference,
      supportingSummary: verificationRecords.supportingSummary,
      status: verificationRecords.status,
      reviewNotes: verificationRecords.reviewNotes,
      submittedAt: verificationRecords.submittedAt,
      reviewedAt: verificationRecords.reviewedAt,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      currentPosition: mentorProfiles.currentPosition,
      organisation: mentorProfiles.organisation,
    })
    .from(verificationRecords)
    .innerJoin(users, eq(verificationRecords.mentorId, users.id))
    .leftJoin(mentorProfiles, eq(verificationRecords.mentorId, mentorProfiles.userId))
    .orderBy(desc(verificationRecords.submittedAt));

  return ok({ verifications: rows });
}
