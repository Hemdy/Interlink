import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  communityPosts,
  getDb,
  postComments,
  postLikes,
  users,
} from "@interlink/database";
import type { CommunityPostType } from "@interlink/types";

export interface CommunityPostCommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  content: string;
  createdAt: string;
}

export interface CommunityPostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string | null;
  postType: CommunityPostType;
  topic: string;
  title: string | null;
  body: string;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "document" | null;
  externalLink: string | null;
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
  comments: CommunityPostCommentItem[];
  createdAt: string;
}

export async function listPublicCommunityPosts(
  viewerUserId?: string | null,
  limit = 30,
): Promise<CommunityPostItem[]> {
  const db = getDb();

  const postRows = await db
    .select({
      id: communityPosts.id,
      authorId: communityPosts.authorId,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      authorImage: users.profileImage,
      postType: communityPosts.postType,
      topic: communityPosts.topic,
      title: communityPosts.title,
      body: communityPosts.body,
      mediaUrl: communityPosts.mediaUrl,
      mediaType: communityPosts.mediaType,
      externalLink: communityPosts.externalLink,
      likesCount: communityPosts.likesCount,
      commentsCount: communityPosts.commentsCount,
      createdAt: communityPosts.createdAt,
    })
    .from(communityPosts)
    .innerJoin(users, eq(communityPosts.authorId, users.id))
    .where(eq(communityPosts.isPublished, true))
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);

  if (postRows.length === 0) return [];

  const postIds = postRows.map((p) => p.id);

  const [commentRows, viewerLikes] = await Promise.all([
    db
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
      .where(inArray(postComments.postId, postIds))
      .orderBy(asc(postComments.createdAt)),
    viewerUserId
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(eq(postLikes.userId, viewerUserId))
      : Promise.resolve([]),
  ]);

  const likedPostIds = new Set(viewerLikes.map((l) => l.postId));
  const commentsByPost = new Map<string, CommunityPostCommentItem[]>();

  for (const row of commentRows) {
    const existing = commentsByPost.get(row.postId) ?? [];
    existing.push({
      id: row.id,
      postId: row.postId,
      authorId: row.authorId,
      authorName: `${row.authorFirstName} ${row.authorLastName}`.trim(),
      authorImage: row.authorImage,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    });
    commentsByPost.set(row.postId, existing);
  }

  return postRows.map((row) => ({
    id: row.id,
    authorId: row.authorId,
    authorName: `${row.authorFirstName} ${row.authorLastName}`.trim(),
    authorImage: row.authorImage,
    postType: row.postType,
    topic: row.topic,
    title: row.title,
    body: row.body,
    mediaUrl: row.mediaUrl,
    mediaType:
      row.mediaType === "image" ||
      row.mediaType === "video" ||
      row.mediaType === "document"
        ? row.mediaType
        : null,
    externalLink: row.externalLink,
    likesCount: row.likesCount,
    commentsCount: row.commentsCount,
    viewerHasLiked: likedPostIds.has(row.id),
    comments: commentsByPost.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}
