import { asc, eq } from "drizzle-orm";
import { getDb, industries, isDatabaseConfigured } from "@interlink/database";
import { PublicShell } from "@/components/layout/PublicShell";
import {
  getRecommendedMentorsForUser,
  listPublicMentors,
} from "@/features/discovery/infrastructure/mentorQueries";
import { MentorDirectoryClient } from "@/features/discovery/ui/MentorDirectoryClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MentorsDirectoryPage() {
  const user = await getCurrentUser();

  const [{ mentors }, recommended, industryList] = await Promise.all([
    listPublicMentors({ limit: 24, viewerUserId: user?.id ?? null }),
    user ? getRecommendedMentorsForUser(user.id, 3) : Promise.resolve([]),
    isDatabaseConfigured()
      ? getDb()
          .select({ id: industries.id, name: industries.name })
          .from(industries)
          .where(eq(industries.isActive, true))
          .orderBy(asc(industries.name))
      : Promise.resolve([]),
  ]);

  return (
    <PublicShell user={user}>
      <section className="border-b border-interlink-border bg-interlink-surface py-12">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
            Explore Members
          </p>
          <h1 className="mt-2 font-display text-3xl font-light text-interlink-ink">
            Browse Mentors
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-interlink-muted">
            Discover credible industry mentors by expertise, availability, and session format.
          </p>
        </div>
      </section>

      <section className="bg-interlink-app-bg py-10">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <MentorDirectoryClient
            initialMentors={mentors}
            recommendedMentors={recommended}
            industries={industryList}
            user={user}
          />
        </div>
      </section>
    </PublicShell>
  );
}
