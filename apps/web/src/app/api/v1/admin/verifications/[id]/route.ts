import { eq } from "drizzle-orm";
import { getDb, mentorProfiles, verificationRecords } from "@interlink/database";
import { reviewVerificationSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { createNotification, recordAuditLog } from "@/lib/notifications/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid verification ID.", 400);

  const parsed = await parseBody(request, reviewVerificationSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(verificationRecords)
    .set({
      status: parsed.data.status,
      reviewNotes: parsed.data.reviewNotes ?? null,
      reviewedBy: admin.id,
      reviewedAt: now,
    })
    .where(eq(verificationRecords.id, id))
    .returning();

  if (!updated) return apiError("Verification record not found.", 404);

  await db
    .update(mentorProfiles)
    .set({
      verificationStatus: parsed.data.status,
      lastVerifiedAt: parsed.data.status === "verified" ? now : null,
      updatedAt: now,
    })
    .where(eq(mentorProfiles.userId, updated.mentorId));

  await createNotification({
    userId: updated.mentorId,
    type: "verification_changed",
    title: "Mentor Verification Updated",
    message: `Your mentor verification status is now: ${parsed.data.status}.`,
    relatedEntityId: updated.id,
    actionUrl: "/profile",
  });

  await recordAuditLog({
    actorId: admin.id,
    action: "mentor_verification_reviewed",
    entityType: "verification_record",
    entityId: updated.id,
    metadata: { status: parsed.data.status, mentorId: updated.mentorId },
  });

  return ok({ verification: updated });
}
