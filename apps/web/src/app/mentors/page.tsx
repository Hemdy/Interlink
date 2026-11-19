import { Suspense } from "react";
import { MentorDirectoryContentSkeleton } from "@/components/layout/PageSkeletons";
import { PublicShell } from "@/components/layout/PublicShell";
import { InteractiveMatteHero } from "@/components/ui/InteractiveMatteHero";
import {
  getRecommendedMentorsForUser,
  listActiveIndustries,
  listPublicMentors,
} from "@/features/discovery/infrastructure/mentorQueries";
import { MentorDirectoryClient } from "@/features/discovery/ui/MentorDirectoryClient";
import { getCurrentUser } from "@/lib/auth/session";

async function MentorDirectorySection() {
  const user = await getCurrentUser();
  const [{ mentors }, industryList] = await Promise.all([
    listPublicMentors({ limit: 24, viewerUserId: user?.id ?? null }),
    listActiveIndustries(),
  ]);

  const recommended = user ? await getRecommendedMentorsForUser(user.id, 3, mentors) : [];

  return (
    <MentorDirectoryClient
      initialMentors={mentors}
      recommendedMentors={recommended}
      industries={industryList}
      user={user}
    />
  );
}

export default function MentorsDirectoryPage() {
  return (
    <PublicShell>
      <InteractiveMatteHero paddingClassName="py-12 sm:py-14">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <div className="animate-hero-up">
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
        </div>
      </InteractiveMatteHero>

      <section className="bg-interlink-app-bg py-10">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <Suspense fallback={<MentorDirectoryContentSkeleton />}>
            <MentorDirectorySection />
          </Suspense>
        </div>
      </section>
    </PublicShell>
  );
}
