import { getDb, reports } from "@interlink/database";
import { createReportSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, createReportSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.reportedUserId === user.id) {
    return apiError("You cannot report yourself.", 400);
  }

  const [report] = await getDb()
    .insert(reports)
    .values({
      reporterId: user.id,
      reportedUserId: parsed.data.reportedUserId,
      relatedEntityId: parsed.data.relatedEntityId ?? null,
      reason: parsed.data.reason,
      description: parsed.data.description,
      status: "open",
    })
    .returning();

  await recordAuditLog({
    actorId: user.id,
    action: "safety_report_submitted",
    entityType: "report",
    entityId: report?.id ?? null,
    metadata: { reason: parsed.data.reason },
  });

  return created({ report });
}
