import { USER_ROLES, type UserRole } from "@interlink/types";
import { getDb } from "./connection";
import { roles } from "./schema";

const roleLabels: Record<UserRole, string> = {
  mentee: "Mentee",
  mentor: "Mentor",
  admin: "Administrator",
  super_admin: "Super administrator",
  community_manager: "Community manager",
  programme_coordinator: "Programme coordinator",
};

async function seedRoles() {
  await getDb()
    .insert(roles)
    .values(USER_ROLES.map((key) => ({ key, label: roleLabels[key] })))
    .onConflictDoNothing();
}

void seedRoles().catch((error: unknown) => {
  console.error("Failed to seed the role catalogue.", error);
  process.exitCode = 1;
});
