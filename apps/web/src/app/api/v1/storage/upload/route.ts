import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, users, verificationRecords } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import {
  getPresignedAssetUrl,
  isObjectStorageConfigured,
  uploadAsset,
} from "@/lib/storage/assets";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  if (!isObjectStorageConfigured()) {
    return apiError("Neon Object Storage is not configured in environment.", 503);
  }

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const formData = await request.formData().catch(() => null);
  if (!formData) return apiError("Expected multipart/form-data request.", 400);

  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "avatar");
  const mentorshipId = formData.get("mentorshipId")
    ? String(formData.get("mentorshipId"))
    : null;

  if (!(file instanceof File)) {
    return apiError("A file field is required.", 400);
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return apiError("File size must be between 1 byte and 5 MB.", 400);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return apiError("Unsupported file type. Allowed: JPEG, PNG, WebP, or PDF.", 400);
  }

  if (purpose === "avatar" && file.type === "application/pdf") {
    return apiError("Profile photographs must be JPEG, PNG, or WebP images.", 400);
  }

  let key: string;
  if (purpose === "avatar") {
    key = `avatars/${user.id}/${randomUUID()}.${ext}`;
  } else if (purpose === "verification") {
    key = `verifications/${user.id}/${randomUUID()}.${ext}`;
  } else if (purpose === "resource") {
    if (!mentorshipId || !uuidSchema.safeParse(mentorshipId).success) {
      return apiError("Valid mentorshipId is required for workspace resource uploads.", 400);
    }
    const mentorship = await getMentorshipForParticipant(mentorshipId, user.id);
    if (!mentorship) return apiError("Forbidden.", 403);
    key = `resources/${mentorshipId}/${randomUUID()}.${ext}`;
  } else {
    return apiError("Invalid upload purpose.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  await uploadAsset(key, bytes, file.type);

  const db = getDb();
  if (purpose === "avatar") {
    await db
      .update(users)
      .set({ profileImage: key, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  } else if (purpose === "verification") {
    await db.insert(verificationRecords).values({
      mentorId: user.id,
      verificationType: "uploaded_credential",
      documentReference: key,
      supportingSummary: `Uploaded ${file.name}`,
      status: "registered",
    });
  }

  const signedUrl = await getPresignedAssetUrl(key, 3600);

  return created({
    key,
    signedUrl,
    contentType: file.type,
    size: file.size,
  });
}
