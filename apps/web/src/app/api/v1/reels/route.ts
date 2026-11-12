import { getDb, mentorReels } from "@interlink/database";
import { createMentorReelSchema } from "@interlink/validation";
import { listPublishedMentorReels } from "@/features/content/infrastructure/contentQueries";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reels = await listPublishedMentorReels();
    return ok({ reels });
  } catch (err) {
    return handleRouteError("reels/GET", err);
  }
}

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const canPublish = user.roles.includes("mentor") || isAdminRole(user.roles);
    if (!canPublish) {
      return apiError("Only mentors or administrators can publish spotlight reels.", 403);
    }

    const parsed = await parseBody(request, createMentorReelSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [inserted] = await db
      .insert(mentorReels)
      .values({
        mentorId: user.id,
        mentorName: parsed.data.mentorName,
        profession: parsed.data.profession,
        careerPath: parsed.data.careerPath,
        title: parsed.data.title,
        summary: parsed.data.summary,
        videoUrl: parsed.data.videoUrl,
        posterImageUrl: parsed.data.posterImageUrl || "/images/mentor-spotlight.jpg",
        durationLabel: parsed.data.durationLabel,
        topicTag: parsed.data.topicTag,
        isPublished: true,
      })
      .returning();

    if (!inserted) {
      return apiError("Unable to publish motivational reel.", 500);
    }

    return created({
      reel: {
        ...inserted,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError("reels/POST", err);
  }
}
