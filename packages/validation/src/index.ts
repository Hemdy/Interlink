import { z } from "zod";
import { ACCOUNT_STATUSES, USER_ROLES } from "@interlink/types";

export const userRoleSchema = z.enum(USER_ROLES);
export const accountStatusSchema = z.enum(ACCOUNT_STATUSES);
export const emailSchema = z
  .string()
  .trim()
  .email()
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
