export const USER_ROLES = [
  "mentee",
  "mentor",
  "admin",
  "super_admin",
  "community_manager",
  "programme_coordinator",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["active", "suspended", "deactivated"] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "registered",
  "reviewed",
  "verified",
  "rejected",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const SESSION_PREFERENCES = ["online", "in_person", "hybrid"] as const;

export type SessionPreference = (typeof SESSION_PREFERENCES)[number];

export const AVAILABILITY_STATUSES = ["accepting", "paused", "full"] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const REQUEST_STATUSES = [
  "pending",
  "info_requested",
  "accepted",
  "rejected",
  "cancelled",
  "expired",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const MENTORSHIP_STATUSES = [
  "active",
  "paused",
  "completed",
  "terminated",
] as const;

export type MentorshipStatus = (typeof MENTORSHIP_STATUSES)[number];

export const GOAL_STATUSES = [
  "not_started",
  "in_progress",
  "submitted_for_review",
  "under_review",
  "completed",
  "overdue",
  "cancelled",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const MILESTONE_STATUSES = ["pending", "in_progress", "completed"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const SESSION_STATUSES = [
  "proposed",
  "confirmed",
  "rescheduled",
  "completed",
  "cancelled",
  "missed",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SKILL_TYPES = ["existing", "development_priority", "expertise"] as const;

export type SkillType = (typeof SKILL_TYPES)[number];

export const REPORT_REASONS = [
  "harassment",
  "discrimination",
  "fraud",
  "impersonation",
  "misrepresentation",
  "solicitation",
  "unprofessional_conduct",
  "suspicious_message",
  "unsafe_behaviour",
  "inappropriate_content",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["open", "under_review", "resolved", "dismissed"] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "registration",
  "email_verification",
  "request_received",
  "request_accepted",
  "request_rejected",
  "info_requested",
  "new_message",
  "session_scheduled",
  "session_rescheduled",
  "session_cancelled",
  "session_completed",
  "goal_created",
  "progress_submitted",
  "mentor_feedback",
  "relationship_paused",
  "relationship_completed",
  "verification_changed",
  "report_updated",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const RESOURCE_TYPES = ["article", "guide", "template", "video", "link"] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const PROFILE_VISIBILITIES = ["public", "members_only", "private"] as const;

export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];

export const ADMIN_ROLES: readonly UserRole[] = [
  "admin",
  "super_admin",
  "community_manager",
  "programme_coordinator",
];

export interface SessionUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  status: AccountStatus;
  emailVerifiedAt: string | null;
  roles: UserRole[];
  primaryRole: UserRole;
  onboardingCompleted: boolean;
}

export interface PublicMentorSummary {
  userId: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  currentPosition: string;
  organisation: string | null;
  industryName: string | null;
  industryId: string | null;
  yearsOfExperience: number;
  biography: string;
  expertiseTags: string[];
  languages: string[];
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  sessionPreference: SessionPreference;
  maximumMentees: number;
  activeMenteeCount: number;
  profileCompletion: number;
  location: string | null;
  updatedAt: string;
  isSaved?: boolean;
  matchScore?: number;
  matchReasons?: string[];
}

export const EVENT_CATEGORIES = ["workshop", "event", "opportunity", "promotion"] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface MentorReelItem {
  id: string;
  mentorId: string | null;
  mentorName: string;
  profession: string;
  careerPath: string;
  title: string;
  summary: string;
  videoUrl: string;
  posterImageUrl: string | null;
  durationLabel: string;
  topicTag: string;
  createdAt: string;
}

export interface PlatformEventItem {
  id: string;
  title: string;
  category: EventCategory;
  summary: string;
  imageUrl: string;
  eventDate: string | null;
  locationOrFormat: string;
  ctaLabel: string;
  ctaUrl: string | null;
  isFeatured: boolean;
  registrationCount?: number;
  isRegistered?: boolean;
}
