import { and, eq } from "drizzle-orm";
import { communityPosts, getDb } from "@interlink/database";
import { updatePostSchema, uuidSchema } from "@interlink/validation";
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

    const parsed = await parseBody(request, updatePostSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [existing] = await db
      .select({ id: communityPosts.id, authorId: communityPosts.authorId })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!existing) return apiError("Post not found.", 404);
    if (existing.authorId !== user.id) {
      return apiError("You can only edit posts you authored.", 403);
    }

    const data = parsed.data;
    const [updated] = await db
      .update(communityPosts)
      .set({
        ...(data.postType !== undefined ? { postType: data.postType } : {}),
        ...(data.topic !== undefined ? { topic: data.topic.trim() || "Community" } : {}),
        ...(data.title !== undefined ? { title: data.title?.trim() || null } : {}),
        ...(data.body !== undefined ? { body: data.body.trim() } : {}),
        ...(data.mediaUrl !== undefined ? { mediaUrl: data.mediaUrl?.trim() || null } : {}),
        ...(data.mediaType !== undefined ? { mediaType: data.mediaType ?? null } : {}),
        ...(data.externalLink !== undefined
          ? { externalLink: data.externalLink?.trim() || null }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.authorId, user.id)))
      .returning();

    return ok({ post: updated });
  } catch (err) {
    return handleRouteError("posts/[id]/PATCH", err);
  }
}

export async function DELETE(
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
    const [existing] = await db
      .select({ id: communityPosts.id, authorId: communityPosts.authorId })
      .from(communityPosts)
      .where(eq(communityPosts.id, postId))
      .limit(1);

    if (!existing) return apiError("Post not found.", 404);
    if (existing.authorId !== user.id) {
      return apiError("You can only delete posts you authored.", 403);
    }

    await db
      .delete(communityPosts)
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.authorId, user.id)));

    return ok({ deleted: true });
  } catch (err) {
    return handleRouteError("posts/[id]/DELETE", err);
  }
}
