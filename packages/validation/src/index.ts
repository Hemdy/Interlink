import { z } from "zod";
import {
  ACCOUNT_STATUSES,
  AVAILABILITY_STATUSES,
  GOAL_STATUSES,
  MENTORSHIP_STATUSES,
  MILESTONE_STATUSES,
  NOTIFICATION_TYPES,
  PROFILE_VISIBILITIES,
  REPORT_REASONS,
  REPORT_STATUSES,
  RESOURCE_TYPES,
  SESSION_PREFERENCES,
  SESSION_STATUSES,
  USER_ROLES,
  VERIFICATION_STATUSES,
} from "@interlink/types";

export const userRoleSchema = z.enum(USER_ROLES);
export const publicRegistrationRoleSchema = z.enum(["mentee", "mentor"]);
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export const verificationStatusSchema = z.enum(VERIFICATION_STATUSES);
export const sessionPreferenceSchema = z.enum(SESSION_PREFERENCES);
export const availabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);
export const mentorshipStatusSchema = z.enum(MENTORSHIP_STATUSES);
export const goalStatusSchema = z.enum(GOAL_STATUSES);
export const milestoneStatusSchema = z.enum(MILESTONE_STATUSES);
export const sessionStatusSchema = z.enum(SESSION_STATUSES);
export const reportReasonSchema = z.enum(REPORT_REASONS);
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export const resourceTypeSchema = z.enum(RESOURCE_TYPES);
export const profileVisibilitySchema = z.enum(PROFILE_VISIBILITIES);

export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address.")
  .max(320)
  .transform((email) => email.toLowerCase());

export const uuidSchema = z.string().uuid();

export const databaseUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
    message: "Expected a PostgreSQL connection URL",
  });

export const databaseEnvironmentSchema = z.object({
  DATABASE_URL: databaseUrlSchema,
});

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.");

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(100),
    lastName: z.string().trim().min(1, "Last name is required.").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: publicRegistrationRoleSchema.default("mentee"),
    acceptPolicies: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms, Privacy Policy, and Cookie Policy." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required.").max(320),
  password: z.string().min(1, "Password is required.").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(10, "Invalid reset token."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(10, "Invalid verification token."),
});

export const accountUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username may only contain letters, numbers, dots, underscores, and hyphens.")
    .optional()
    .nullable(),
  profileImage: z.string().trim().url().max(1000).optional().nullable(),
});

export const mentorProfileSchema = z.object({
  biography: z.string().trim().min(20, "Please write at least 20 characters about your experience.").max(3000),
  currentPosition: z.string().trim().min(2, "Current position is required.").max(150),
  organisation: z.string().trim().max(150).optional().nullable(),
  industryId: uuidSchema.optional().nullable(),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  qualifications: z.string().trim().max(1000).optional().nullable(),
  expertiseAreas: z.array(z.string().trim().min(1).max(80)).min(1, "Select at least one area of expertise.").max(20),
  skills: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  mentorshipInterests: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(50)).min(1, "Add at least one spoken language.").max(10),
  location: z.string().trim().max(120).optional().nullable(),
  linkedinUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  portfolioUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  mentorshipApproach: z.string().trim().max(2000).optional().nullable(),
  sessionPreference: sessionPreferenceSchema.default("online"),
  availabilityStatus: availabilityStatusSchema.default("accepting"),
  maximumMentees: z.coerce.number().int().min(1).max(25).default(3),
  visibility: profileVisibilitySchema.default("public"),
  onboardingCompleted: z.boolean().optional(),
  verificationNotes: z.string().trim().max(1000).optional().nullable(),
});

export const menteeProfileSchema = z.object({
  education: z.string().trim().max(300).optional().nullable(),
  currentOccupation: z.string().trim().min(2, "Current occupation or study status is required.").max(150),
  industryInterestId: uuidSchema.optional().nullable(),
  careerInterests: z.array(z.string().trim().min(1).max(80)).min(1, "Select at least one career interest.").max(20),
  careerAspirations: z.string().trim().min(15, "Describe your career aspirations.").max(2000),
  existingSkills: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  skillsToDevelop: z.array(z.string().trim().min(1).max(80)).max(25).default([]),
  currentChallenges: z.string().trim().max(2000).optional().nullable(),
  mentorshipExpectations: z.string().trim().max(2000).optional().nullable(),
  learningObjectives: z.string().trim().max(2000).optional().nullable(),
  preferredLanguage: z.string().trim().min(2).max(50).default("English"),
  sessionPreference: sessionPreferenceSchema.default("online"),
  location: z.string().trim().max(120).optional().nullable(),
  visibility: profileVisibilitySchema.default("members_only"),
  onboardingCompleted: z.boolean().optional(),
});

export const mentorAvailabilitySlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  timezone: z.string().trim().min(2).max(80).default("Africa/Lagos"),
  isActive: z.boolean().default(true),
});

export const mentorAvailabilityUpdateSchema = z.object({
  availabilityStatus: availabilityStatusSchema.optional(),
  maximumMentees: z.coerce.number().int().min(1).max(25).optional(),
  slots: z.array(mentorAvailabilitySlotSchema).max(21),
});

export const createMentorshipRequestSchema = z.object({
  mentorId: uuidSchema,
  introductionMessage: z.string().trim().min(20, "Please write a brief introduction (at least 20 characters).").max(2000),
  careerObjective: z.string().trim().min(10, "State your career objective.").max(1000),
  reasonForSelection: z.string().trim().min(10, "Explain why you selected this mentor.").max(1000),
  expectedOutcome: z.string().trim().min(10, "Describe your expected outcomes.").max(1000),
  preferredDuration: z.string().trim().min(2).max(80).default("3 months"),
  relevantBackground: z.string().trim().max(1500).optional().nullable(),
  sessionPreference: sessionPreferenceSchema.default("online"),
});

export const respondMentorshipRequestSchema = z.object({
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateMentorshipStatusSchema = z.object({
  status: mentorshipStatusSchema,
  completionSummary: z.string().trim().max(3000).optional().nullable(),
});

export const createGoalSchema = z.object({
  title: z.string().trim().min(3, "Goal title is required.").max(200),
  description: z.string().trim().min(5, "Goal description is required.").max(2000),
  expectedOutcome: z.string().trim().max(1000).optional().nullable(),
  targetDate: z.string().trim().optional().nullable(),
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  expectedOutcome: z.string().trim().max(1000).optional().nullable(),
  targetDate: z.string().trim().optional().nullable(),
  status: goalStatusSchema.optional(),
  mentorFeedback: z.string().trim().max(2000).optional().nullable(),
});

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(2, "Milestone title is required.").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.string().trim().optional().nullable(),
});

export const updateMilestoneSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  dueDate: z.string().trim().optional().nullable(),
  status: milestoneStatusSchema.optional(),
  evidenceUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
});

export const createProgressUpdateSchema = z.object({
  milestoneId: uuidSchema.optional().nullable(),
  description: z.string().trim().min(5, "Describe your progress update.").max(2000),
  evidenceUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
});

export const createSessionSchema = z.object({
  mentorshipId: uuidSchema,
  title: z.string().trim().min(3, "Session title is required.").max(200),
  description: z.string().trim().max(1500).optional().nullable(),
  startTime: z.string().datetime({ message: "Valid ISO start date/time is required." }),
  endTime: z.string().datetime({ message: "Valid ISO end date/time is required." }),
  timezone: z.string().trim().min(2).max(80).default("Africa/Lagos"),
  sessionType: sessionPreferenceSchema.default("online"),
  meetingLink: z.string().trim().url("Enter a valid meeting URL.").max(500).optional().nullable().or(z.literal("")),
});

export const updateSessionSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(1500).optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  sessionType: sessionPreferenceSchema.optional(),
  meetingLink: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  status: sessionStatusSchema.optional(),
  attendanceStatus: z.enum(["pending", "both_attended", "mentor_only", "mentee_only", "missed"]).optional(),
  summary: z.string().trim().max(3000).optional().nullable(),
});

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message cannot be empty.").max(4000),
  attachmentUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
});

export const createResourceSchema = z.object({
  mentorshipId: uuidSchema.optional().nullable(),
  title: z.string().trim().min(3, "Title is required.").max(200),
  description: z.string().trim().min(5, "Description is required.").max(1500),
  resourceType: resourceTypeSchema.default("article"),
  externalUrl: z.string().trim().url("Valid URL is required.").max(800),
  category: z.string().trim().max(80).optional().nullable(),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  visibility: z.enum(["private", "public"]).default("private"),
});

export const createReportSchema = z.object({
  reportedUserId: uuidSchema,
  relatedEntityId: uuidSchema.optional().nullable(),
  reason: reportReasonSchema,
  description: z.string().trim().min(10, "Please explain what happened.").max(2500),
});

export const resolveReportSchema = z.object({
  status: reportStatusSchema,
  resolution: z.string().trim().min(3).max(2000),
});

export const reviewVerificationSchema = z.object({
  status: verificationStatusSchema,
  reviewNotes: z.string().trim().max(1500).optional().nullable(),
});

export const adminUpdateUserStatusSchema = z.object({
  status: accountStatusSchema,
  reason: z.string().trim().max(500).optional().nullable(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional().nullable(),
});
