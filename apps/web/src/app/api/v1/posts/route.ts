import { communityPosts, getDb, isDatabaseConfigured } from "@interlink/database";
import { createPostSchema } from "@interlink/validation";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { listPublicCommunityPosts } from "@/features/content/infrastructure/postQueries";
import { broadcastNewPostNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return ok({ posts: [] });
    }
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 30)));
    const viewer = await getCurrentUser();
    const posts = await listPublicCommunityPosts(viewer?.id ?? null, limit);
    return ok({ posts });
  } catch (err) {
    return handleRouteError("posts/GET", err);
  }
}

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const parsed = await parseBody(request, createPostSchema);
    if (parsed.error) return parsed.error;

    const data = parsed.data;
    const db = getDb();

    const [inserted] = await db
      .insert(communityPosts)
      .values({
        authorId: user.id,
        postType: data.postType,
        topic: data.topic.trim() || "Community",
        title: data.title?.trim() || null,
        body: data.body.trim(),
        mediaUrl: data.mediaUrl?.trim() || null,
        mediaType: data.mediaType ?? null,
        externalLink: data.externalLink?.trim() || null,
        isPublished: true,
      })
      .returning();

    if (!inserted) {
      return apiError("Failed to create post.", 500);
    }

    const authorName = `${user.firstName} ${user.lastName}`.trim() || "Interlink Member";
    const postSummary = inserted.title || inserted.body;

    await broadcastNewPostNotification({
      postId: inserted.id,
      authorId: user.id,
      authorName,
      authorAvatar: user.profileImage ?? null,
      postTitle: postSummary,
      postType: inserted.postType,
    });

    return created({
      post: {
        id: inserted.id,
        authorId: inserted.authorId,
        authorName,
        authorImage: user.profileImage ?? null,
        postType: inserted.postType,
        topic: inserted.topic,
        title: inserted.title,
        body: inserted.body,
        mediaUrl: inserted.mediaUrl,
        mediaType:
          inserted.mediaType === "image" ||
          inserted.mediaType === "video" ||
          inserted.mediaType === "document"
            ? inserted.mediaType
            : null,
        externalLink: inserted.externalLink,
        likesCount: inserted.likesCount,
        commentsCount: inserted.commentsCount,
        viewerHasLiked: false,
        comments: [],
        createdAt: inserted.createdAt.toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError("posts/POST", err);
  }
}
