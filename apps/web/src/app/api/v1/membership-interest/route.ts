import { count, eq } from "drizzle-orm";
import { getDb, membershipTierInterests } from "@interlink/database";
import { membershipInterestSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAuditLog } from "@/lib/notifications/service";

export async function GET() {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const db = getDb();
  const user = await getCurrentUser();

  const grouped = await db
    .select({
      tier: membershipTierInterests.tier,
      total: count(),
    })
    .from(membershipTierInterests)
    .groupBy(membershipTierInterests.tier);

  const counts = { free: 0, plus: 0, pro: 0 };
  for (const row of grouped) {
    counts[row.tier] = Number(row.total);
  }

  let userTier: string | null = null;
  if (user) {
    const [mine] = await db
      .select({ tier: membershipTierInterests.tier })
      .from(membershipTierInterests)
      .where(eq(membershipTierInterests.userId, user.id))
      .limit(1);
    userTier = mine?.tier ?? null;
  }

  return ok({ counts, userTier });
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const parsed = await parseBody(request, membershipInterestSchema);
  if (parsed.error) return parsed.error;

  const user = await getCurrentUser();
  const db = getDb();
  const data = parsed.data;

  const [existing] = await db
    .select({ id: membershipTierInterests.id })
    .from(membershipTierInterests)
    .where(eq(membershipTierInterests.email, data.email))
    .limit(1);

  const [record] = existing
    ? await db
        .update(membershipTierInterests)
        .set({
          userId: user?.id ?? null,
          fullName: data.fullName,
          tier: data.tier,
          notes: data.notes || null,
        })
        .where(eq(membershipTierInterests.id, existing.id))
        .returning()
    : await db
        .insert(membershipTierInterests)
        .values({
          userId: user?.id ?? null,
          email: data.email,
          fullName: data.fullName,
          tier: data.tier,
          notes: data.notes || null,
        })
        .returning();

  if (!record) {
    return apiError("Failed to record membership interest.", 500);
  }

  if (user) {
    await recordAuditLog({
      actorId: user.id,
      action: "membership_interest_recorded",
      entityType: "membership_tier_interest",
      entityId: record.id,
      metadata: { tier: record.tier },
    });
  }

  return created({ interest: record });
}
