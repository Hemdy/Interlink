import { asc, eq, sql } from "drizzle-orm";
import { communityPosts, getDb, isDatabaseConfigured, postComments, users } from "@interlink/database";
import { createPostCommentSchema, uuidSchema } from "@interlink/validation";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!isDatabaseConfigured()) return ok({ comments: [] });
    const { id: postId } = await context.params;
    if (!uuidSchema.safeParse(postId).success) {
      return apiError("Invalid post ID.", 400);
    }

    const rows = await getDb()
      .select({
        id: postComments.id,
        postId: postComments.postId,
        authorId: postComments.authorId,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
        authorImage: users.profileImage,
        content: postComments.content,
        createdAt: postComments.createdAt,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(asc(postComments.createdAt));

    return ok({
      comments: rows.map((row) => ({
        id: row.id,
        postId: row.postId,
        authorId: row.authorId,
        authorName: `${row.authorFirstName} ${row.authorLastName}`.trim(),
        authorImage: row.authorImage,
        content: row.content,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError("posts/[id]/comments/GET", err);
  }
}

export async function POST(
  request: Request,
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

    const parsed = await parseBody(request, createPostCommentSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [post] = await db
      .select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        commentsCount: communityPosts.commentsCount,
      })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!post) {
      return apiError("Post not found.", 404);
    }

    const [inserted] = await db
      .insert(postComments)
      .values({
        postId,
        authorId: user.id,
        content: parsed.data.content.trim(),
      })
      .returning();

    if (!inserted) {
      return apiError("Unable to publish comment.", 500);
    }

    const [updatedPost] = await db
      .update(communityPosts)
      .set({
        commentsCount: sql`${communityPosts.commentsCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, postId))
      .returning({ commentsCount: communityPosts.commentsCount });

    const actorName = `${user.firstName} ${user.lastName}`.trim() || "Someone";

    if (post.authorId !== user.id) {
      await createNotification({
        userId: post.authorId,
        title: `${actorName} commented on your post`,
        message: inserted.content.slice(0, 140),
        type: "post_commented",
        relatedEntityId: post.id,
        actionUrl: `/dashboard?post=${post.id}&comment=${inserted.id}#post-${post.id}`,
        dedupeKeyBase: `post_commented:${inserted.id}`,
        actorName,
        actorAvatar: user.profileImage ?? null,
        postId: post.id,
        commentId: inserted.id,
      });
    }

    return created({
      comment: {
        id: inserted.id,
        postId: inserted.postId,
        authorId: inserted.authorId,
        authorName: actorName,
        authorImage: user.profileImage ?? null,
        content: inserted.content,
        createdAt: inserted.createdAt.toISOString(),
      },
      commentsCount: updatedPost?.commentsCount ?? post.commentsCount + 1,
    });
  } catch (err) {
    return handleRouteError("posts/[id]/comments/POST", err);
  }
}
