import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

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
