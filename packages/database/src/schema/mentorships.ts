import { MENTORSHIP_STATUSES, REQUEST_STATUSES } from "@interlink/types";
import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sessionPreferenceEnum } from "./profiles";
import { users } from "./users";

export const requestStatusEnum = pgEnum("request_status", REQUEST_STATUSES);
export const mentorshipStatusEnum = pgEnum("mentorship_status", MENTORSHIP_STATUSES);
export const reviewVisibilityEnum = pgEnum("review_visibility", ["private", "public"]);

export const mentorshipRequests = pgTable(
  "mentorship_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    menteeId: uuid("mentee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    introductionMessage: text("introduction_message").notNull(),
    careerObjective: text("career_objective").notNull(),
    reasonForSelection: text("reason_for_selection").notNull(),
    expectedOutcome: text("expected_outcome").notNull(),
    preferredDuration: varchar("preferred_duration", { length: 80 }).notNull().default("3 months"),
    relevantBackground: text("relevant_background"),
    sessionPreference: sessionPreferenceEnum("session_preference").notNull().default("online"),
    status: requestStatusEnum("status").notNull().default("pending"),
    mentorNotes: text("mentor_notes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("no_self_mentorship_request", sql`${table.menteeId} <> ${table.mentorId}`)],
);

export const mentorshipRequestHistory = pgTable("mentorship_request_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => mentorshipRequests.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  previousStatus: requestStatusEnum("previous_status"),
  newStatus: requestStatusEnum("new_status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mentorships = pgTable(
  "mentorships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    menteeId: uuid("mentee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .unique()
      .references(() => mentorshipRequests.id, { onDelete: "restrict" }),
    status: mentorshipStatusEnum("status").notNull().default("active"),
    agreedExpectations: text("agreed_expectations"),
    communicationPreferences: text("communication_preferences"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp("end_date", { withTimezone: true }),
    completionSummary: text("completion_summary"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("no_self_mentorship", sql`${table.mentorId} <> ${table.menteeId}`),
    uniqueIndex("unique_active_mentor_mentee_idx")
      .on(table.mentorId, table.menteeId)
      .where(sql`${table.status} IN ('active', 'paused')`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mentorshipId: uuid("mentorship_id")
      .notNull()
      .references(() => mentorships.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    visibility: reviewVisibilityEnum("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("rating_range_check", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    uniqueIndex("unique_review_per_mentorship_reviewer").on(table.mentorshipId, table.reviewerId),
  ],
);
