import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { BookOpen, ExternalLink, Target } from "lucide-react";
import { getDb, isDatabaseConfigured, resources, users } from "@interlink/database";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge, Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import {
  listPublishedMentorReels,
  listPublishedPlatformEvents,
} from "@/features/content/infrastructure/contentQueries";
import { PromotionsEventsSection } from "@/features/events/ui/PromotionsEventsSection";
import { MentorSpotlightSection } from "@/features/spotlight/ui/MentorSpotlightSection";
import { getCurrentUser } from "@/lib/auth/session";

const careerPaths = [
  {
    track: "Technology & Engineering",
    title: "Frontend & Full-Stack Software Engineer",
    duration: "12 Weeks",
    milestones: [
      "Audit core web fundamentals & accessibility standards",
      "Build two production-grade portfolio applications",
      "Refine technical CV & GitHub architecture notes",
      "Complete two mock system & coding interviews with a mentor",
    ],
  },
  {
    track: "Product & Design",
    title: "Product Management & UX Transition",
    duration: "10 Weeks",
    milestones: [
      "Conduct structured user discovery interviews",
      "Author a product specification & success metrics plan",
      "Assemble two end-to-end case studies",
      "Prepare product sense & execution interview frameworks",
    ],
  },
  {
    track: "Business & Entrepreneurship",
    title: "Founder Readiness & Venture Launch",
    duration: "12 Weeks",
    milestones: [
      "Validate problem statement & customer segment",
      "Build unit economics & simple financial model",
      "Design pilot go-to-market plan",
      "Review pitch narrative & governance basics",
    ],
  },
];

export default async function LearnPage() {
  const user = await getCurrentUser();
  const [reels, events] = await Promise.all([
    listPublishedMentorReels(),
    listPublishedPlatformEvents(),
  ]);

  let sharedResources: Array<{
    id: string;
    title: string;
    description: string;
    resourceType: string;
    externalUrl: string;
    category: string | null;
    authorFirstName: string;
    authorLastName: string;
  }> = [];

  if (isDatabaseConfigured()) {
    try {
      sharedResources = await getDb()
        .select({
          id: resources.id,
          title: resources.title,
          description: resources.description,
          resourceType: resources.resourceType,
          externalUrl: resources.externalUrl,
          category: resources.category,
          authorFirstName: users.firstName,
          authorLastName: users.lastName,
        })
        .from(resources)
        .innerJoin(users, eq(resources.createdBy, users.id))
        .where(isNull(resources.mentorshipId))
        .orderBy(desc(resources.createdAt))
        .limit(12);
    } catch {
      sharedResources = [];
    }
  }

  return (
    <PublicShell user={user}>
      <section className="border-b border-interlink-border bg-interlink-surface py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-10">
          <div className="animate-hero-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
              Learn &amp; Career Paths
            </p>
            <h1 className="mt-3 font-display text-3xl font-light text-interlink-ink sm:text-4xl lg:text-[42px]">
              Structured career pathways to guide your mentorship goals.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-interlink-muted">
              Use these milestone blueprints when submitting a mentorship request or setting up
              objectives inside your dedicated mentorship workspace.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-interlink-app-bg py-16">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-10">
          <h2 className="font-display text-2xl font-light text-interlink-ink">
            Recommended Career Path Blueprints
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {careerPaths.map((path, idx) => (
              <Reveal key={path.title} delayMs={idx * 80} className="h-full">
                <Card className="flex h-full flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-interlink-forest/40">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="forest">{path.track}</Badge>
                    <span className="text-xs text-interlink-muted">{path.duration}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-interlink-ink">
                    {path.title}
                  </h3>
                  <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-interlink-muted">
                    {path.milestones.map((m) => (
                      <li key={m} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interlink-forest" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border-t border-interlink-border/70 pt-4">
                  <Link
                    href="/mentors"
                    className="text-xs font-semibold text-interlink-forest hover:underline"
                  >
                    Find a Mentor for this Path &rarr;
                  </Link>
                </div>
              </Card>
              </Reveal>
            ))}
          </div>

          <div className="mt-14">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-light text-interlink-ink">
                Shared Learning Resources
              </h2>
              {user && (user.primaryRole === "mentor" || user.primaryRole === "admin") && (
                <Link
                  href="/dashboard"
                  className="text-xs font-medium text-interlink-forest hover:underline"
                >
                  Manage Resources in Dashboard
                </Link>
              )}
            </div>

            {sharedResources.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
                {sharedResources.map((res) => (
                  <Card key={res.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <Badge tone="neutral">{res.resourceType}</Badge>
                        {res.category && (
                          <span className="text-xs text-interlink-muted">{res.category}</span>
                        )}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-interlink-ink">
                        {res.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-interlink-muted">
                        {res.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-interlink-border/70 pt-3">
                      <span className="text-[11px] text-interlink-muted">
                        By {res.authorFirstName} {res.authorLastName}
                      </span>
                      <a
                        href={res.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-interlink-forest hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card elevated className="mt-6">
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 text-interlink-forest" />
                  <div>
                    <h3 className="text-sm font-semibold text-interlink-ink">
                      Curated learning resources appear here
                    </h3>
                    <p className="mt-1 text-sm text-interlink-muted">
                      Verified mentors and administrators can publish career guides, templates,
                      and study links directly to the Interlink library, and share private
                      resources inside individual mentorship workspaces.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </section>

      <MentorSpotlightSection initialReels={reels} user={user} />

      <PromotionsEventsSection initialEvents={events} user={user} />
    </PublicShell>
  );
}
