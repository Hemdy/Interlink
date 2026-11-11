import { eq } from "drizzle-orm";
import { getDb, reports } from "@interlink/database";
import { resolveReportSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { createNotification, recordAuditLog } from "@/lib/notifications/service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const admin = await getCurrentUser();
  if (!admin) return apiError("Authentication required.", 401);
  if (!isAdminRole(admin.roles)) return apiError("Administrator access required.", 403);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid report ID.", 400);

  const parsed = await parseBody(request, resolveReportSchema);
  if (parsed.error) return parsed.error;

  const now = new Date();
  const [updated] = await getDb()
    .update(reports)
    .set({
      status: parsed.data.status,
      resolution: parsed.data.resolution,
      assignedTo: admin.id,
      resolvedAt:
        parsed.data.status === "resolved" || parsed.data.status === "dismissed"
          ? now
          : null,
    })
    .where(eq(reports.id, id))
    .returning();

  if (!updated) return apiError("Report not found.", 404);

  await createNotification({
    userId: updated.reporterId,
    type: "report_updated",
    title: "Safety Report Updated",
    message: `Your safety report status has been updated to: ${parsed.data.status}.`,
    relatedEntityId: updated.id,
    actionUrl: "/notifications",
  });

  await recordAuditLog({
    actorId: admin.id,
    action: "admin_report_updated",
    entityType: "report",
    entityId: updated.id,
    metadata: { status: parsed.data.status },
  });

  return ok({ report: updated });
}
