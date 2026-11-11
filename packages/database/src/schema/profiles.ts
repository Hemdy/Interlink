import {
  AVAILABILITY_STATUSES,
  PROFILE_VISIBILITIES,
  SESSION_PREFERENCES,
  VERIFICATION_STATUSES,
} from "@interlink/types";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { industries } from "./catalog";
import { users } from "./users";

export const verificationStatusEnum = pgEnum("verification_status", VERIFICATION_STATUSES);
export const sessionPreferenceEnum = pgEnum("session_preference", SESSION_PREFERENCES);
export const availabilityStatusEnum = pgEnum("availability_status", AVAILABILITY_STATUSES);
export const profileVisibilityEnum = pgEnum("profile_visibility", PROFILE_VISIBILITIES);

export const mentorProfiles = pgTable("mentor_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  biography: text("biography").notNull().default(""),
  currentPosition: varchar("current_position", { length: 150 }).notNull().default(""),
  organisation: varchar("organisation", { length: 150 }),
  industryId: uuid("industry_id").references(() => industries.id, { onDelete: "set null" }),
  yearsOfExperience: integer("years_of_experience").notNull().default(0),
  qualifications: text("qualifications"),
  expertiseAreas: text("expertise_areas").array().notNull().default([]),
  skills: text("skills").array().notNull().default([]),
  mentorshipInterests: text("mentorship_interests").array().notNull().default([]),
  languages: text("languages").array().notNull().default(["English"]),
  location: varchar("location", { length: 120 }),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  mentorshipApproach: text("mentorship_approach"),
  sessionPreference: sessionPreferenceEnum("session_preference").notNull().default("online"),
  availabilityStatus: availabilityStatusEnum("availability_status").notNull().default("accepting"),
  maximumMentees: integer("maximum_mentees").notNull().default(3),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("registered"),
  visibility: profileVisibilityEnum("visibility").notNull().default("public"),
  profileCompletion: integer("profile_completion").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menteeProfiles = pgTable("mentee_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  education: varchar("education", { length: 300 }),
  currentOccupation: varchar("current_occupation", { length: 150 }).notNull().default(""),
  industryInterestId: uuid("industry_interest_id").references(() => industries.id, {
    onDelete: "set null",
  }),
  careerInterests: text("career_interests").array().notNull().default([]),
  careerAspirations: text("career_aspirations").notNull().default(""),
  existingSkills: text("existing_skills").array().notNull().default([]),
  skillsToDevelop: text("skills_to_develop").array().notNull().default([]),
  currentChallenges: text("current_challenges"),
  mentorshipExpectations: text("mentorship_expectations"),
  learningObjectives: text("learning_objectives"),
  preferredLanguage: varchar("preferred_language", { length: 50 }).notNull().default("English"),
  sessionPreference: sessionPreferenceEnum("session_preference").notNull().default("online"),
  location: varchar("location", { length: 120 }),
  visibility: profileVisibilityEnum("visibility").notNull().default("members_only"),
  profileCompletion: integer("profile_completion").notNull().default(0),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mentorAvailability = pgTable("mentor_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  timezone: varchar("timezone", { length: 80 }).notNull().default("Africa/Lagos"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedMentors = pgTable(
  "saved_mentors",
  {
    menteeId: uuid("mentee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mentorId: uuid("mentor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.menteeId, table.mentorId] })],
);
