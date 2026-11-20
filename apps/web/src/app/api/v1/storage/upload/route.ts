import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, users, verificationRecords } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, handleRouteError } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import {
  getPresignedAssetUrl,
  isObjectStorageConfigured,
  uploadAsset,
} from "@/lib/storage/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_DOC_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AVATAR_BYTES = 1024 * 1024;

type AssetCategory = "image" | "video" | "document";

const MIME_TO_EXT: Record<string, { ext: string; mime: string; category: AssetCategory }> = {
  "image/jpeg": { ext: "jpg", mime: "image/jpeg", category: "image" },
  "image/jpg": { ext: "jpg", mime: "image/jpeg", category: "image" },
  "image/png": { ext: "png", mime: "image/png", category: "image" },
  "image/webp": { ext: "webp", mime: "image/webp", category: "image" },
  "video/mp4": { ext: "mp4", mime: "video/mp4", category: "video" },
  "video/webm": { ext: "webm", mime: "video/webm", category: "video" },
  "video/quicktime": { ext: "mov", mime: "video/quicktime", category: "video" },
  "application/pdf": { ext: "pdf", mime: "application/pdf", category: "document" },
  "text/plain": { ext: "txt", mime: "text/plain", category: "document" },
  "text/markdown": { ext: "md", mime: "text/markdown", category: "document" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "document",
  },
};

const EXT_TO_MIME: Record<string, { ext: string; mime: string; category: AssetCategory }> = {
  jpg: { ext: "jpg", mime: "image/jpeg", category: "image" },
  jpeg: { ext: "jpg", mime: "image/jpeg", category: "image" },
  png: { ext: "png", mime: "image/png", category: "image" },
  webp: { ext: "webp", mime: "image/webp", category: "image" },
  mp4: { ext: "mp4", mime: "video/mp4", category: "video" },
  webm: { ext: "webm", mime: "video/webm", category: "video" },
  mov: { ext: "mov", mime: "video/quicktime", category: "video" },
  pdf: { ext: "pdf", mime: "application/pdf", category: "document" },
  txt: { ext: "txt", mime: "text/plain", category: "document" },
  md: { ext: "md", mime: "text/markdown", category: "document" },
  docx: {
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "document",
  },
};

function resolveFileType(
  file: File,
): { ext: string; mime: string; category: AssetCategory } | null {
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

    const resolved = resolveFileType(file);
    if (!resolved) {
      return apiError(
        "Unsupported file type. Allowed: JPEG, PNG, WebP, MP4, WebM, MOV, PDF, TXT, MD, or DOCX.",
        400,
      );
    }

    const maxAllowedBytes =
      purpose === "avatar"
        ? MAX_AVATAR_BYTES
        : resolved.category === "video"
          ? MAX_VIDEO_BYTES
          : MAX_IMAGE_DOC_BYTES;

    if (file.size <= 0 || file.size > maxAllowedBytes) {
      return apiError(
        `File size must be between 1 byte and ${Math.round(maxAllowedBytes / (1024 * 1024))} MB.`,
        400,
      );
    }

    if (purpose === "avatar" && resolved.category !== "image") {
      return apiError("Profile photographs must be JPEG, PNG, or WebP images.", 400);
    }

    if (purpose === "verification" && resolved.category === "video") {
      return apiError("Verification uploads must be PDF documents or images.", 400);
    }

    if (purpose !== "avatar" && !isObjectStorageConfigured()) {
      return apiError("Neon Object Storage is not configured in environment.", 503);
    }

    let key: string;
    if (purpose === "avatar") {
      key = `avatars/${user.id}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "verification") {
      key = `verifications/${user.id}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "reel") {
      if (!user.roles.includes("mentor") && !isAdminRole(user.roles)) {
        return apiError("Only mentors or administrators can upload spotlight media.", 403);
      }
      if (resolved.category === "document") {
        return apiError("Spotlight reels require video or image files.", 400);
      }
      key = `reels/${user.id}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "chat") {
      if (!mentorshipId || !uuidSchema.safeParse(mentorshipId).success) {
        return apiError("Valid mentorshipId is required for chat uploads.", 400);
      }
      const mentorship = await getMentorshipForParticipant(mentorshipId, user.id);
      if (!mentorship) return apiError("Forbidden.", 403);
      key = `chat/${mentorshipId}/${randomUUID()}.${resolved.ext}`;
    } else if (purpose === "resource") {
      if (mentorshipId) {
        if (!uuidSchema.safeParse(mentorshipId).success) {
          return apiError("Invalid mentorshipId for resource upload.", 400);
        }
        const mentorship = await getMentorshipForParticipant(mentorshipId, user.id);
        if (!mentorship) return apiError("Forbidden.", 403);
        key = `resources/${mentorshipId}/${randomUUID()}.${resolved.ext}`;
      } else {
        key = `resources/${user.id}/${randomUUID()}.${resolved.ext}`;
      }
    } else if (purpose === "post") {
      key = `posts/${user.id}/${randomUUID()}.${resolved.ext}`;
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
        url: signedUrl,
        signedUrl,
        contentType: resolved.mime,
        size: file.size,
        fileName: file.name,
        category: resolved.category,
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
    const permanentUrl = `/api/v1/storage/file?key=${encodeURIComponent(key)}`;

    return created({
      key,
      url: permanentUrl,
      signedUrl,
      contentType: resolved.mime,
      size: file.size,
      fileName: file.name,
      category: resolved.category,
    });
  } catch (err) {
    return handleRouteError("storage/upload", err);
  }
}
