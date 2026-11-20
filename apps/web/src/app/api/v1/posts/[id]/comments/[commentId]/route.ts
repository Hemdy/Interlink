import { and, eq, sql } from "drizzle-orm";
import { communityPosts, getDb, postComments } from "@interlink/database";
import { updatePostCommentSchema, uuidSchema } from "@interlink/validation";
import {
  apiError,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id: postId, commentId } = await context.params;
    if (!uuidSchema.safeParse(postId).success || !uuidSchema.safeParse(commentId).success) {
      return apiError("Invalid post or comment ID.", 400);
    }

    const parsed = await parseBody(request, updatePostCommentSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [comment] = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        authorId: postComments.authorId,
      })
      .from(postComments)
      .where(and(eq(postComments.id, commentId), eq(postComments.postId, postId)))
      .limit(1);

    if (!comment) {
      return apiError("Comment not found.", 404);
    }

    // Strict permission: only the comment author may edit a comment (post authors cannot edit others' comments)
    if (comment.authorId !== user.id) {
      return apiError("Only the comment author can edit this comment.", 403);
    }

    const [updated] = await db
      .update(postComments)
      .set({
        content: parsed.data.content.trim(),
        updatedAt: new Date(),
      })
      .where(and(eq(postComments.id, commentId), eq(postComments.authorId, user.id)))
      .returning();

    return ok({
      comment: {
        id: updated?.id ?? commentId,
        content: updated?.content ?? parsed.data.content.trim(),
        updatedAt: (updated?.updatedAt ?? new Date()).toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError("posts/[id]/comments/[commentId]/PATCH", err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id: postId, commentId } = await context.params;
    if (!uuidSchema.safeParse(postId).success || !uuidSchema.safeParse(commentId).success) {
      return apiError("Invalid post or comment ID.", 400);
    }

    const db = getDb();
    const [commentRow] = await db
      .select({
        id: postComments.id,
        postId: postComments.postId,
        commentAuthorId: postComments.authorId,
        postAuthorId: communityPosts.authorId,
      })
      .from(postComments)
      .innerJoin(communityPosts, eq(postComments.postId, communityPosts.id))
      .where(and(eq(postComments.id, commentId), eq(postComments.postId, postId)))
      .limit(1);

    if (!commentRow) {
      return apiError("Comment not found.", 404);
    }

    const canDelete =
      commentRow.commentAuthorId === user.id || commentRow.postAuthorId === user.id;
    if (!canDelete) {
      return apiError("You do not have permission to delete this comment.", 403);
    }

    await db.delete(postComments).where(eq(postComments.id, commentId));

    const [updatedPost] = await db
      .update(communityPosts)
      .set({
        commentsCount: sql`GREATEST(0, ${communityPosts.commentsCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(communityPosts.id, postId))
      .returning({ commentsCount: communityPosts.commentsCount });

    return ok({
      deleted: true,
      commentsCount: updatedPost?.commentsCount ?? 0,
    });
  } catch (err) {
    return handleRouteError("posts/[id]/comments/[commentId]/DELETE", err);
  }
}
