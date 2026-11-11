import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";
import {
  assetExists,
  getPresignedAssetUrl,
  isObjectStorageConfigured,
} from "@/lib/storage/assets";

export async function GET(request: Request) {
  if (!isObjectStorageConfigured()) {
    return apiError("Neon Object Storage is not configured.", 503);
  }

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const mode = searchParams.get("mode");

  if (!key || key.includes("..")) {
    return apiError("Invalid asset key.", 400);
  }

  const parts = key.split("/");
  const folder = parts[0];
  const scopeId = parts[1];

  if (folder === "verifications") {
    if (scopeId !== user.id && !isAdminRole(user.roles)) {
      return apiError("Forbidden.", 403);
    }
  } else if (folder === "resources") {
    if (!scopeId) return apiError("Invalid resource key.", 400);
    const mentorship = await getMentorshipForParticipant(scopeId, user.id);
    if (!mentorship && !isAdminRole(user.roles)) {
      return apiError("Forbidden.", 403);
    }
  } else if (folder !== "avatars") {
    return apiError("Unsupported asset scope.", 400);
  }

  const exists = await assetExists(key);
  if (!exists) {
    return apiError("File not found in Neon Object Storage.", 404);
  }

  const signedUrl = await getPresignedAssetUrl(key, 3600);
  if (mode === "json") {
    return NextResponse.json({ data: { key, url: signedUrl } });
  }

  return NextResponse.redirect(signedUrl);
}
