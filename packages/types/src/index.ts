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
