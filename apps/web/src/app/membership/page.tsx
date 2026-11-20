import { count, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, membershipTierInterests } from "@interlink/database";
import { PublicShell } from "@/components/layout/PublicShell";
import { InteractiveMatteHero } from "@/components/ui/InteractiveMatteHero";
import { MembershipClient } from "@/features/membership/ui/MembershipClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MembershipPage() {
  const user = await getCurrentUser();
  const db = isDatabaseConfigured() ? getDb() : null;

  const counts = { free: 0, plus: 0, pro: 0 };
  let userTier: string | null = null;

  if (db) {
    try {
      const [grouped, mine] = await Promise.all([
        db
          .select({ tier: membershipTierInterests.tier, total: count() })
          .from(membershipTierInterests)
          .groupBy(membershipTierInterests.tier),
        user
          ? db
              .select({ tier: membershipTierInterests.tier })
              .from(membershipTierInterests)
              .where(eq(membershipTierInterests.userId, user.id))
              .limit(1)
          : Promise.resolve([]),
      ]);

      for (const row of grouped) {
        counts[row.tier] = Number(row.total);
      }
      userTier = mine[0]?.tier ?? null;
    } catch {
      // Fall back gracefully if query fails
    }
  }

  return (
    <PublicShell user={user}>
      <InteractiveMatteHero>
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <div className="animate-hero-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
              Membership &amp; Marketplace Access
            </p>
            <h1 className="mt-3 font-display text-3xl font-light text-interlink-ink sm:text-4xl lg:text-[42px]">
              Accessible community mentorship first — built to scale career outcomes.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-interlink-muted">
              Free profiles, community participation, and access to free mentorship stay open to all
              members. Explore our proposed Plus and Pro tiers alongside flexible mentor packages.
            </p>
          </div>
        </div>
      </InteractiveMatteHero>

      <section className="bg-interlink-app-bg py-16">
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <MembershipClient
            user={user}
            initialCounts={counts}
            initialUserTier={userTier}
          />
        </div>
      </section>
    </PublicShell>
  );
}
