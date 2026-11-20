import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  communityPosts,
  getDb,
  mentorReels,
  postComments,
  postLikes,
  resources,
  users,
} from "@interlink/database";
import type { CommunityPostType, ResourceType } from "@interlink/types";

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

export interface UserPublishedArticleItem {
  id: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  externalUrl: string;
  category: string | null;
  createdAt: string;
}

export interface UserPublishedReelItem {
  id: string;
  title: string;
  summary: string;
  topicTag: string;
  careerPath: string;
  durationLabel: string;
  videoUrl: string;
  posterImageUrl: string | null;
  createdAt: string;
}

export async function listUserPublishedContent(userId: string): Promise<{
  posts: CommunityPostItem[];
  videos: UserPublishedReelItem[];
  articles: UserPublishedArticleItem[];
}> {
  const db = getDb();

  const [postRows, reelRows, articleRows] = await Promise.all([
    db
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
      .where(eq(communityPosts.authorId, userId))
      .orderBy(desc(communityPosts.createdAt))
      .limit(60),
    db
      .select({
        id: mentorReels.id,
        title: mentorReels.title,
        summary: mentorReels.summary,
        topicTag: mentorReels.topicTag,
        careerPath: mentorReels.careerPath,
        durationLabel: mentorReels.durationLabel,
        videoUrl: mentorReels.videoUrl,
        posterImageUrl: mentorReels.posterImageUrl,
        createdAt: mentorReels.createdAt,
      })
      .from(mentorReels)
      .where(eq(mentorReels.mentorId, userId))
      .orderBy(desc(mentorReels.createdAt))
      .limit(30),
    db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        resourceType: resources.resourceType,
        externalUrl: resources.externalUrl,
        category: resources.category,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .where(and(eq(resources.createdBy, userId), isNull(resources.mentorshipId)))
      .orderBy(desc(resources.createdAt))
      .limit(40),
  ]);

  const postIds = postRows.map((r) => r.id);
  const [commentRows, likedRows] = await Promise.all([
    postIds.length > 0
      ? db
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
          .orderBy(asc(postComments.createdAt))
      : Promise.resolve([]),
    postIds.length > 0
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(eq(postLikes.userId, userId))
      : Promise.resolve([]),
  ]);

  const likedSet = new Set(likedRows.map((l) => l.postId));
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

  return {
    posts: postRows.map((row) => ({
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
      viewerHasLiked: likedSet.has(row.id),
      comments: commentsByPost.get(row.id) ?? [],
      createdAt: row.createdAt.toISOString(),
    })),
    videos: reelRows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    articles: articleRows.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
