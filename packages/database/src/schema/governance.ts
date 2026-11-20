import {
  NOTIFICATION_TYPES,
  PUSH_DELIVERY_STATUSES,
  REPORT_REASONS,
  REPORT_STATUSES,
} from "@interlink/types";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { verificationStatusEnum } from "./profiles";
import { users } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", NOTIFICATION_TYPES);
export const pushDeliveryStatusEnum = pgEnum("push_delivery_status", PUSH_DELIVERY_STATUSES);
export const reportReasonEnum = pgEnum("report_reason", REPORT_REASONS);
export const reportStatusEnum = pgEnum("report_status", REPORT_STATUSES);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull(),
  relatedEntityId: uuid("related_entity_id"),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notificationType: notificationTypeEnum("notification_type").notNull(),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("unique_notification_pref_user_type").on(table.userId, table.notificationType),
  ],
);

export interface PushNotificationJobPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url: string;
  actorName?: string;
  actorAvatar?: string | null;
  postId?: string;
  commentId?: string;
}

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  deviceLabel: varchar("device_label", { length: 120 }),
  platform: varchar("platform", { length: 40 }).notNull().default("other"),
  isActive: boolean("is_active").notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lastError: text("last_error"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushDeliveryJobs = pgTable("push_delivery_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => pushSubscriptions.id, { onDelete: "cascade" }),
  notificationType: notificationTypeEnum("notification_type").notNull(),
  dedupeKey: varchar("dedupe_key", { length: 255 }).notNull().unique(),
  payload: jsonb("payload").$type<PushNotificationJobPayload>().notNull(),
  status: pushDeliveryStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(4),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationRecords = pgTable("verification_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  verificationType: varchar("verification_type", { length: 100 }).notNull(),
  documentReference: text("document_reference"),
  supportingSummary: text("supporting_summary"),
  status: verificationStatusEnum("status").notNull().default("registered"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: uuid("reported_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  relatedEntityId: uuid("related_entity_id"),
  reason: reportReasonEnum("reason").notNull(),
  description: text("description").notNull(),
  status: reportStatusEnum("status").notNull().default("open"),
  resolution: text("resolution"),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedUserId: uuid("blocked_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.blockerId, table.blockedUserId] })],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
