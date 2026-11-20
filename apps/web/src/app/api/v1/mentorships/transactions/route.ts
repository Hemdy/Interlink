import { desc, eq, inArray, or } from "drizzle-orm";
import { getDb, mentorshipTransactions, users } from "@interlink/database";
import { checkoutSettlementSchema, uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification, recordAuditLog } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const rows = await db
    .select()
    .from(mentorshipTransactions)
    .where(
      or(
        eq(mentorshipTransactions.mentorId, user.id),
        eq(mentorshipTransactions.menteeId, user.id),
      ),
    )
    .orderBy(desc(mentorshipTransactions.createdAt));

  const userIds = Array.from(new Set(rows.flatMap((r) => [r.mentorId, r.menteeId])));
  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  const items = rows.map((r) => ({
    ...r,
    mentorName: userMap.get(r.mentorId)
      ? `${userMap.get(r.mentorId)!.firstName} ${userMap.get(r.mentorId)!.lastName}`
      : "Mentor",
    menteeName: userMap.get(r.menteeId)
      ? `${userMap.get(r.menteeId)!.firstName} ${userMap.get(r.menteeId)!.lastName}`
      : "Mentee",
  }));

  const mentorRows = items.filter((r) => r.mentorId === user.id);
  const completedMentorRows = mentorRows.filter((r) => r.status === "completed");
  const pendingMentorRows = mentorRows.filter((r) => r.status === "pending_checkout");

  return ok({
    transactions: items,
    mentorSummary: {
      grossTotalNgn: completedMentorRows.reduce((sum, r) => sum + r.grossAmountNgn, 0),
      platformFeeTotalNgn: completedMentorRows.reduce((sum, r) => sum + r.platformFeeNgn, 0),
      mentorPayoutTotalNgn: completedMentorRows.reduce((sum, r) => sum + r.mentorPayoutNgn, 0),
      pendingGrossNgn: pendingMentorRows.reduce((sum, r) => sum + r.grossAmountNgn, 0),
      pendingPayoutNgn: pendingMentorRows.reduce((sum, r) => sum + r.mentorPayoutNgn, 0),
      completedCount: completedMentorRows.length,
      pendingCount: pendingMentorRows.length,
    },
  });
}

export async function PATCH(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("id") ?? "";
  if (!uuidSchema.safeParse(transactionId).success) {
    return apiError("Invalid transaction ID.", 400);
  }

  const parsed = await parseBody(request, checkoutSettlementSchema);
  if (parsed.error) return parsed.error;

  const db = getDb();
  const [tx] = await db
    .select()
    .from(mentorshipTransactions)
    .where(eq(mentorshipTransactions.id, transactionId))
    .limit(1);

  if (!tx) return apiError("Transaction not found.", 404);
  if (tx.menteeId !== user.id && tx.mentorId !== user.id) {
    return apiError("Forbidden.", 403);
  }
  if (tx.status !== "pending_checkout") {
    return apiError(`Transaction is already '${tx.status}'.`, 409);
  }

  const nextStatus = parsed.data.action === "cancel" ? "cancelled" : "completed";
  const now = new Date();

  const [updated] = await db
    .update(mentorshipTransactions)
    .set({
      status: nextStatus,
      providerReference: parsed.data.providerReference || tx.providerReference,
      settledAt: nextStatus === "completed" ? now : null,
      updatedAt: now,
    })
    .where(eq(mentorshipTransactions.id, tx.id))
    .returning();

  if (nextStatus === "completed") {
    await createNotification({
      userId: tx.mentorId,
      type: "request_accepted",
      title: "Paid Mentorship Settled",
      message: `₦${tx.mentorPayoutNgn.toLocaleString("en-NG")} (85% mentor share of ₦${tx.grossAmountNgn.toLocaleString("en-NG")}) recorded in your ledger.`,
      relatedEntityId: tx.id,
      actionUrl: "/requests",
    });
  }

  await recordAuditLog({
    actorId: user.id,
    action: "mentorship_transaction_updated",
    entityType: "mentorship_transaction",
    entityId: tx.id,
    metadata: { status: nextStatus, grossAmountNgn: tx.grossAmountNgn },
  });

  return ok({ transaction: updated });
}
