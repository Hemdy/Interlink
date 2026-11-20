import { COMMUNITY_POST_TYPES } from "@interlink/types";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const communityPostTypeEnum = pgEnum("community_post_type", COMMUNITY_POST_TYPES);

export const communityPosts = pgTable("community_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postType: communityPostTypeEnum("post_type").notNull().default("post"),
  topic: varchar("topic", { length: 80 }).notNull().default("Community"),
  title: varchar("title", { length: 200 }),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 30 }),
  externalLink: text("external_link"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("unique_post_like_user").on(table.postId, table.userId)],
);

export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => communityPosts.id, { onDelete: "cascade" }),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mentorReels = pgTable("mentor_reels", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id").references(() => users.id, { onDelete: "set null" }),
  mentorName: varchar("mentor_name", { length: 160 }).notNull(),
  profession: varchar("profession", { length: 160 }).notNull(),
  careerPath: varchar("career_path", { length: 240 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary").notNull(),
  videoUrl: text("video_url").notNull(),
  posterImageUrl: text("poster_image_url"),
  durationLabel: varchar("duration_label", { length: 20 }).notNull().default("0:45"),
  topicTag: varchar("topic_tag", { length: 80 }).notNull().default("Career Growth"),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformEvents = pgTable("platform_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 40 }).notNull().default("workshop"),
  summary: text("summary").notNull(),
  imageUrl: text("image_url").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }),
  locationOrFormat: varchar("location_or_format", { length: 160 }).notNull(),
  ctaLabel: varchar("cta_label", { length: 80 }).notNull().default("Reserve Seat"),
  ctaUrl: text("cta_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => platformEvents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  attendeeName: varchar("attendee_name", { length: 160 }).notNull(),
  attendeeEmail: varchar("attendee_email", { length: 320 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
