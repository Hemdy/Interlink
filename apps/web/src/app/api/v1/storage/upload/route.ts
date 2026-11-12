import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, users, verificationRecords } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, handleRouteError } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import {
  getPresignedAssetUrl,
  isObjectStorageConfigured,
  uploadAsset,
} from "@/lib/storage/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AVATAR_BYTES = 1024 * 1024;

const MIME_TO_EXT: Record<string, { ext: string; mime: string }> = {
  "image/jpeg": { ext: "jpg", mime: "image/jpeg" },
  "image/jpg": { ext: "jpg", mime: "image/jpeg" },
  "image/png": { ext: "png", mime: "image/png" },
  "image/webp": { ext: "webp", mime: "image/webp" },
  "application/pdf": { ext: "pdf", mime: "application/pdf" },
};

const EXT_TO_MIME: Record<string, { ext: string; mime: string }> = {
  jpg: { ext: "jpg", mime: "image/jpeg" },
  jpeg: { ext: "jpg", mime: "image/jpeg" },
  png: { ext: "png", mime: "image/png" },
  webp: { ext: "webp", mime: "image/webp" },
  pdf: { ext: "pdf", mime: "application/pdf" },
};

function resolveFileType(file: File): { ext: string; mime: string } | null {
  const normalizedType = file.type.toLowerCase().trim();
  if (normalizedType && MIME_TO_EXT[normalizedType]) {
    return MIME_TO_EXT[normalizedType];
  }
  const fileExt = file.name.split(".").pop()?.toLowerCase().trim();
  if (fileExt && EXT_TO_MIME[fileExt]) {
    return EXT_TO_MIME[fileExt];
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

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

    const resolved = resolveFileType(file);
    if (!resolved) {
      return apiError("Unsupported file type. Allowed: JPEG, PNG, WebP, or PDF.", 400);
    }

    if (purpose === "avatar" && resolved.mime === "application/pdf") {
      return apiError("Profile photographs must be JPEG, PNG, or WebP images.", 400);
    }

    if (purpose !== "avatar" && !isObjectStorageConfigured()) {
      return apiError("Neon Object Storage is not configured in environment.", 503);
    }

    let key: string;
    if (purpose === "avatar") {
      key = `avatars/${user.id}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "verification") {
      key = `verifications/${user.id}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "resource") {
      if (!mentorshipId || !uuidSchema.safeParse(mentorshipId).success) {
        return apiError("Valid mentorshipId is required for workspace resource uploads.", 400);
      }
      const mentorship = await getMentorshipForParticipant(mentorshipId, user.id);
      if (!mentorship) return apiError("Forbidden.", 403);
      key = `resources/${mentorshipId}/${randomUUID()}.${resolved.ext}`;
    } else {
      return apiError("Invalid upload purpose.", 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const db = getDb();

    if (purpose === "avatar") {
      let storedValue: string | null = null;
      let signedUrl: string | null = null;

      if (isObjectStorageConfigured()) {
        try {
          await uploadAsset(key, bytes, resolved.mime);
          storedValue = key;
          signedUrl = await getPresignedAssetUrl(key, 3600);
        } catch (storageErr) {
          console.error(
            "[storage/upload] Neon Object Storage upload failed, checking inline fallback:",
            storageErr instanceof Error ? storageErr.message : storageErr,
          );
        }
      }

      if (!storedValue) {
        if (bytes.byteLength > MAX_INLINE_AVATAR_BYTES) {
          return apiError(
            "Image exceeds 1 MB inline limit and object storage is unavailable. Please upload a smaller image.",
            400,
          );
        }
        const dataUrl = `data:${resolved.mime};base64,${Buffer.from(bytes).toString("base64")}`;
        storedValue = dataUrl;
        signedUrl = dataUrl;
      }

      await db
        .update(users)
        .set({ profileImage: storedValue, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      return created({
        key: storedValue,
        signedUrl,
        contentType: resolved.mime,
        size: file.size,
      });
    }

    await uploadAsset(key, bytes, resolved.mime);

    if (purpose === "verification") {
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
      contentType: resolved.mime,
      size: file.size,
    });
  } catch (err) {
    return handleRouteError("storage/upload", err);
  }
}
