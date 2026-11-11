import {
  GOAL_STATUSES,
  MILESTONE_STATUSES,
  RESOURCE_TYPES,
  SESSION_STATUSES,
} from "@interlink/types";
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { mentorships } from "./mentorships";
import { sessionPreferenceEnum } from "./profiles";
import { users } from "./users";

export const goalStatusEnum = pgEnum("goal_status", GOAL_STATUSES);
export const milestoneStatusEnum = pgEnum("milestone_status", MILESTONE_STATUSES);
export const sessionStatusEnum = pgEnum("session_status", SESSION_STATUSES);
export const resourceTypeEnum = pgEnum("resource_type", RESOURCE_TYPES);

export const mentorshipGoals = pgTable("mentorship_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorshipId: uuid("mentorship_id")
    .notNull()
    .references(() => mentorships.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  expectedOutcome: text("expected_outcome"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  status: goalStatusEnum("status").notNull().default("not_started"),
  mentorFeedback: text("mentor_feedback"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => mentorshipGoals.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  evidenceUrl: text("evidence_url"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalProgressUpdates = pgTable("goal_progress_updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => mentorshipGoals.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id").references(() => goalMilestones.id, { onDelete: "set null" }),
  submittedBy: uuid("submitted_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  evidenceUrl: text("evidence_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorshipId: uuid("mentorship_id")
    .notNull()
    .references(() => mentorships.id, { onDelete: "cascade" }),
  proposedBy: uuid("proposed_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("Africa/Lagos"),
  meetingLink: text("meeting_link"),
  sessionType: sessionPreferenceEnum("session_type").notNull().default("online"),
  status: sessionStatusEnum("status").notNull().default("proposed"),
  attendanceStatus: varchar("attendance_status", { length: 40 }).notNull().default("pending"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorshipId: uuid("mentorship_id")
    .notNull()
    .unique()
    .references(() => mentorships.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorshipId: uuid("mentorship_id").references(() => mentorships.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  resourceType: resourceTypeEnum("resource_type").notNull().default("article"),
  externalUrl: text("external_url").notNull(),
  category: varchar("category", { length: 80 }),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
