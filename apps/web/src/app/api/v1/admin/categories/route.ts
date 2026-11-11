import { getDb, industries } from "@interlink/database";
import { createCategorySchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, parseBody } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const parsed = await parseBody(request, createCategorySchema);
  if (parsed.error) return parsed.error;

  const [industry] = await getDb()
    .insert(industries)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      isActive: true,
    })
    .onConflictDoNothing()
    .returning();

  if (!industry) {
    return apiError("That industry category already exists.", 409);
  }

  await recordAuditLog({
    actorId: admin.id,
    action: "admin_industry_created",
    entityType: "industry",
    entityId: industry.id,
    metadata: { name: industry.name },
  });

  return created({ industry });
}
