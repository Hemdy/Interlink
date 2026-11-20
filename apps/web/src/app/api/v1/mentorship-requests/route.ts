import { randomUUID } from "node:crypto";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import {
  getDb,
  mentorProfiles,
  mentorshipRequestHistory,
  mentorshipRequests,
  mentorshipTransactions,
  mentorships,
  userBlocks,
  users,
} from "@interlink/database";
import { calculateMentorshipSplit } from "@interlink/types";
import { createMentorshipRequestSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const db = getDb();
  const rows = await db
    .select()
    .from(mentorshipRequests)
    .where(
      or(
        eq(mentorshipRequests.menteeId, user.id),
        eq(mentorshipRequests.mentorId, user.id),
      ),
    )
    .orderBy(desc(mentorshipRequests.createdAt));

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.menteeId, r.mentorId])),
  );

  const relatedUsers =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: users.profileImage,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const userMap = new Map(relatedUsers.map((u) => [u.id, u]));

  const requests = rows.map((r) => ({
    ...r,
    mentee: userMap.get(r.menteeId) ?? null,
    mentor: userMap.get(r.mentorId) ?? null,
  }));

  return ok({ requests });
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, createMentorshipRequestSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  if (data.mentorId === user.id) {
    return apiError("You cannot submit a mentorship request to yourself.", 400);
  }

  const db = getDb();

  // Check block list
  const [blocked] = await db
    .select()
    .from(userBlocks)
    .where(
      or(
        and(eq(userBlocks.blockerId, data.mentorId), eq(userBlocks.blockedUserId, user.id)),
        and(eq(userBlocks.blockerId, user.id), eq(userBlocks.blockedUserId, data.mentorId)),
      ),
    )
    .limit(1);

  if (blocked) {
    return apiError("Unable to send a mentorship request to this user.", 403);
  }

  // Check mentor exists and is accepting
  const [mentorProfile] = await db
    .select()
    .from(mentorProfiles)
    .where(eq(mentorProfiles.userId, data.mentorId))
    .limit(1);

  if (!mentorProfile) {
    return apiError("Selected mentor profile was not found.", 404);
  }

  if (mentorProfile.availabilityStatus !== "accepting") {
    return apiError("This mentor is not currently accepting new mentorship requests.", 409);
  }

  const [activeCapacityRow] = await db
    .select({ total: count() })
    .from(mentorships)
    .where(and(eq(mentorships.mentorId, data.mentorId), eq(mentorships.status, "active")));

  if (Number(activeCapacityRow?.total ?? 0) >= mentorProfile.maximumMentees) {
    return apiError("This mentor has reached their maximum active mentee capacity.", 409);
  }

  // Prevent duplicate active requests or relationships
  const [existingPending] = await db
    .select({ id: mentorshipRequests.id })
    .from(mentorshipRequests)
    .where(
      and(
        eq(mentorshipRequests.menteeId, user.id),
        eq(mentorshipRequests.mentorId, data.mentorId),
        inArray(mentorshipRequests.status, ["pending", "info_requested"]),
      ),
    )
    .limit(1);

  if (existingPending) {
    return apiError("You already have an open mentorship request with this mentor.", 409);
  }

  const [existingRelationship] = await db
    .select({ id: mentorships.id })
    .from(mentorships)
    .where(
      and(
        eq(mentorships.menteeId, user.id),
        eq(mentorships.mentorId, data.mentorId),
        inArray(mentorships.status, ["active", "paused"]),
      ),
    )
    .limit(1);

  if (existingRelationship) {
    return apiError("You already have an active mentorship relationship with this mentor.", 409);
  }

  const billingCadence = data.billingCadence ?? "free";
  let agreedAmountNgn = 0;

  if (billingCadence === "free") {
    if (mentorProfile.pricingMode === "paid" && !mentorProfile.offersFreeMentorship) {
      return apiError(
        "This mentor currently accepts paid mentorship packages only. Choose one of their paid options.",
        400,
      );
    }
  } else {
    if (mentorProfile.pricingMode === "free") {
      return apiError("This mentor only offers free mentorship.", 400);
    }
    const rateMap = {
      hourly: mentorProfile.hourlyRateNgn,
      per_session: mentorProfile.sessionRateNgn,
      monthly: mentorProfile.monthlyRateNgn,
    } as const;
    const configuredRate = rateMap[billingCadence];
    if (!configuredRate || configuredRate <= 0) {
      return apiError(`This mentor has not configured a ${billingCadence.replace("_", " ")} rate.`, 400);
    }
    agreedAmountNgn = configuredRate;
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [createdReq] = await db
    .insert(mentorshipRequests)
    .values({
      menteeId: user.id,
      mentorId: data.mentorId,
      introductionMessage: data.introductionMessage,
      careerObjective: data.careerObjective,
      reasonForSelection: data.reasonForSelection,
      expectedOutcome: data.expectedOutcome,
      preferredDuration: data.preferredDuration,
      relevantBackground: data.relevantBackground || null,
      sessionPreference: data.sessionPreference,
      billingCadence,
      agreedAmountNgn,
      selectedSlotSummary: data.selectedSlotSummary || null,
      status: "pending",
      expiresAt,
    })
    .returning();

  if (!createdReq) {
    return apiError("Failed to create mentorship request.", 500);
  }

  let createdTransaction = null;
  if (agreedAmountNgn > 0 && billingCadence !== "free") {
    const split = calculateMentorshipSplit(agreedAmountNgn);
    const reference = `ILK-PAY-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    const [tx] = await db
      .insert(mentorshipTransactions)
      .values({
        requestId: createdReq.id,
        mentorId: data.mentorId,
        menteeId: user.id,
        billingCadence,
        grossAmountNgn: split.grossAmountNgn,
        platformFeeNgn: split.platformFeeNgn,
        mentorPayoutNgn: split.mentorPayoutNgn,
        currency: "NGN",
        provider: "paystack",
        providerReference: reference,
        status: "pending_checkout",
      })
      .returning();
    createdTransaction = tx ?? null;
  }

  await db.insert(mentorshipRequestHistory).values({
    requestId: createdReq.id,
    actorId: user.id,
    previousStatus: null,
    newStatus: "pending",
    notes:
      agreedAmountNgn > 0
        ? `Paid mentorship request submitted (₦${agreedAmountNgn.toLocaleString("en-NG")} · ${billingCadence.replace("_", " ")}).`
        : "Mentorship request submitted.",
  });

  await createNotification({
    userId: data.mentorId,
    type: "request_received",
    title: "New Mentorship Request",
    message:
      agreedAmountNgn > 0
        ? `${user.firstName} ${user.lastName} requested a paid mentorship (${billingCadence.replace("_", " ")} · ₦${agreedAmountNgn.toLocaleString("en-NG")}).`
        : `${user.firstName} ${user.lastName} sent you a structured mentorship request.`,
    relatedEntityId: createdReq.id,
    actionUrl: "/requests",
  });

  return created({ request: createdReq, transaction: createdTransaction });
}
