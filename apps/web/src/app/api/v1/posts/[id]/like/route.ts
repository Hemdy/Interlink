import { and, eq, sql } from "drizzle-orm";
import { communityPosts, getDb, postLikes } from "@interlink/database";
import { uuidSchema } from "@interlink/validation";
import {
  apiError,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id: postId } = await context.params;
    if (!uuidSchema.safeParse(postId).success) {
      return apiError("Invalid post ID.", 400);
    }

    const db = getDb();
    const [post] = await db
      .select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        title: communityPosts.title,
        body: communityPosts.body,
        likesCount: communityPosts.likesCount,
      })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!post) {
      return apiError("Post not found.", 404);
    }

    const [existing] = await db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)))
      .limit(1);

    let liked = false;
    let nextLikesCount = post.likesCount;

    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
      const [updated] = await db
        .update(communityPosts)
        .set({
          likesCount: sql`GREATEST(0, ${communityPosts.likesCount} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(communityPosts.id, postId))
        .returning({ likesCount: communityPosts.likesCount });
      nextLikesCount = updated?.likesCount ?? Math.max(0, post.likesCount - 1);
      liked = false;
    } else {
      const inserted = await db
        .insert(postLikes)
        .values({ postId, userId: user.id })
        .onConflictDoNothing({ target: [postLikes.postId, postLikes.userId] })
        .returning({ id: postLikes.id });

      if (inserted.length > 0) {
        const [updated] = await db
          .update(communityPosts)
          .set({
            likesCount: sql`${communityPosts.likesCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(communityPosts.id, postId))
          .returning({ likesCount: communityPosts.likesCount });
        nextLikesCount = updated?.likesCount ?? post.likesCount + 1;
        liked = true;

        if (post.authorId !== user.id) {
          const actorName = `${user.firstName} ${user.lastName}`.trim() || "Someone";
          const snippet = (post.title || post.body).slice(0, 90);
          await createNotification({
            userId: post.authorId,
            title: `${actorName} liked your post`,
            message: snippet,
            type: "post_liked",
            relatedEntityId: post.id,
            actionUrl: `/dashboard?post=${post.id}#post-${post.id}`,
            dedupeKeyBase: `post_liked:${post.id}:${user.id}`,
            actorName,
            actorAvatar: user.profileImage ?? null,
            postId: post.id,
          });
        }
      } else {
        liked = true;
      }
    }

    return ok({ liked, likesCount: nextLikesCount });
  } catch (err) {
    return handleRouteError("posts/[id]/like", err);
  }
}
