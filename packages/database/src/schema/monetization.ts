import { MEMBERSHIP_TIERS } from "@interlink/types";
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const membershipTierEnum = pgEnum("membership_tier", MEMBERSHIP_TIERS);

export const membershipTierInterests = pgTable("membership_tier_interests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 320 }).notNull(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  tier: membershipTierEnum("tier").notNull().default("plus"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
