import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Link2,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge, Card } from "@/components/ui/Card";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { Reveal } from "@/components/ui/Reveal";
import { listPublicMentors } from "@/features/discovery/infrastructure/mentorQueries";
import { getPlatformTrustMetrics } from "@/features/home/infrastructure/platformMetrics";
import { LandingHeroActions } from "@/features/home/ui/LandingHeroActions";
import { getCurrentUser } from "@/lib/auth/session";

const lifecycleStages = [
  {
    step: "01",
    title: "Discover",
    description:
      "Search verified mentors by industry, expertise, availability, and session preference.",
  },
  {
    step: "02",
    title: "Connect",
    description:
      "Submit a structured mentorship request outlining your career objectives and expected outcomes.",
  },
  {
    step: "03",
    title: "Establish",
    description:
      "Align on expectations, communication preferences, and initial milestones inside a dedicated workspace.",
  },
  {
    step: "04",
    title: "Learn & Apply",
    description:
      "Schedule sessions, exchange resources, and work through practical milestones with guidance.",
  },
  {
    step: "05",
    title: "Track & Grow",
    description:
      "Submit progress updates, receive mentor feedback, and complete mentorships with documented outcomes.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const [{ mentors }, metrics] = await Promise.all([
    listPublicMentors({ limit: 3, viewerUserId: user?.id ?? null }),
    getPlatformTrustMetrics(),
  ]);

  const trustItems = metrics.hasLiveMetrics
    ? [
        {
          icon: ShieldCheck,
          value: String(metrics.verifiedMentors),
          label: "Verified Mentors",
          detail: "Credential-checked industry practitioners",
        },
        {
          icon: Users,
          value: String(metrics.activeMembers),
          label: "Active Members",
          detail: "Mentees and mentors across communities",
        },
        {
          icon: Link2,
          value: String(metrics.mentorshipConnections),
          label: "Mentorship Connections",
          detail: "Structured relationships established",
        },
        {
          icon: Award,
          value: String(metrics.completedSessions),
          label: "Completed Sessions",
          detail: "Recorded guidance & progress reviews",
        },
      ]
    : [
        {
          icon: ShieldCheck,
          value: "3-Tier Verification",
          label: "Credible Mentor Profiles",
          detail: "Registered, Reviewed & Verified status levels",
        },
        {
          icon: Users,
          value: "Capacity Protected",
          label: "Focused Mentorship",
          detail: "Mentors set explicit mentee slot limits",
        },
        {
          icon: Link2,
          value: "1:1 Workspaces",
          label: "Structured Connections",
          detail: "Dedicated goals, sessions, and private chat",
        },
        {
          icon: Award,
          value: "Safety Governed",
          label: "Accountable Community",
          detail: "Moderation, reporting & clear guidelines",
        },
      ];

  return (
    <PublicShell user={user}>
      {/* HERO SECTION — Visually aligned to Reference Image 1 */}
      <section className="relative overflow-x-clip bg-interlink-canvas">
        <div className="relative mx-auto max-w-[1360px] lg:min-h-[850px] xl:min-h-[960px]">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Upper-Left Quadrant */}
            <div className="border-b border-interlink-border px-6 py-16 sm:px-10 sm:py-24 lg:col-span-6 lg:min-h-[460px] lg:border-r lg:px-14 lg:pb-24 lg:pt-20">
              <h1 className="animate-hero-up max-w-[520px] font-display text-3xl font-light leading-[1.24] tracking-tight text-interlink-forest sm:text-[38px] lg:text-[42px]">
                Get Linked with experienced mentors who can guide you as you advance in your career
                journey.
              </h1>
              <div className="animate-hero-up-delay-1">
                <LandingHeroActions user={user} />
              </div>
            </div>

            {/* Right Quadrant Structural Spacer */}
            <div className="hidden lg:col-span-6 lg:block lg:min-h-[460px]" />
          </div>

          {/* Enlarged Forest Green Brand Container — Overlapping Column Intersection on Desktop */}
          <div className="px-6 py-10 sm:px-10 sm:py-12 lg:p-0">
            <div className="animate-hero-card mx-auto flex aspect-[1.35/1] w-full max-w-[580px] items-center justify-center bg-interlink-forest-card px-8 py-12 shadow-card sm:px-12 sm:py-16 lg:absolute lg:left-[46%] lg:top-[400px] lg:z-10 lg:w-[50%] lg:max-w-[680px]">
              <InterlinkLogo variant="card" />
            </div>
          </div>
        </div>
      </section>

      {/* COMPACT TRUST INDICATORS */}
      <section
        aria-label="Platform Trust Indicators"
        className="border-t border-interlink-border bg-interlink-surface py-10 sm:py-12"
      >
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.label} delayMs={idx * 70}>
                  <div className="flex items-start gap-3.5 rounded-[2px] border border-interlink-border bg-interlink-app-bg/70 px-5 py-4 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-interlink-forest/50 hover:bg-interlink-surface hover:shadow-elevated">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-interlink-forest/20 bg-interlink-surface text-interlink-forest">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-display text-lg font-semibold leading-snug text-interlink-ink">
                        {item.value}
                      </p>
                      <p className="text-xs font-medium text-interlink-forest">{item.label}</p>
                      <p className="mt-0.5 text-xs text-interlink-muted">{item.detail}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* STRUCTURED MENTORSHIP LIFECYCLE */}
      <section className="border-t border-interlink-border bg-interlink-app-bg py-16 sm:py-20">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
                  Structured Mentorship
                </p>
                <h2 className="mt-2 font-display text-2xl font-light text-interlink-ink sm:text-3xl">
                  Built around purposeful relationships, not superficial feeds.
                </h2>
              </div>
              <Link
                href="/learn"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-interlink-forest transition-colors hover:underline"
              >
                Explore career paths <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {lifecycleStages.map((stage, idx) => (
              <Reveal key={stage.step} delayMs={idx * 75} className="h-full">
                <Card
                  elevated
                  className="flex h-full flex-col justify-between p-5 hover:-translate-y-0.5 hover:border-interlink-forest/50"
                >
                  <div>
                    <span className="text-xs font-semibold tracking-widest text-interlink-gold">
                      STAGE {stage.step}
                    </span>
                    <h3 className="mt-2 font-display text-base font-semibold text-interlink-ink">
                      {stage.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-interlink-muted">
                      {stage.description}
                    </p>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* VERIFIED MENTORS DIRECTORY PREVIEW */}
      <section className="border-t border-interlink-border bg-interlink-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <Reveal>
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
                  Mentor Directory
                </p>
                <h2 className="mt-2 font-display text-2xl font-light text-interlink-ink sm:text-3xl">
                  Connect with experienced professionals ready to guide you.
                </h2>
              </div>
              <Link
                href="/mentors"
                className="inline-flex items-center gap-1.5 rounded-[2px] border border-interlink-hairline bg-interlink-surface px-4 py-2 text-sm font-medium text-interlink-ink shadow-subtle transition-all duration-200 hover:border-interlink-forest hover:text-interlink-forest"
              >
                Browse All Mentors <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          {mentors.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {mentors.map((mentor, idx) => (
                <Reveal key={mentor.userId} delayMs={idx * 90} className="h-full">
                  <Card
                    elevated
                    className="flex h-full flex-col justify-between hover:-translate-y-0.5 hover:border-interlink-forest/50"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-interlink-ink">
                            {mentor.firstName} {mentor.lastName}
                          </h3>
                          <p className="text-xs text-interlink-muted">
                            {mentor.currentPosition}
                            {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                          </p>
                        </div>
                        <Badge
                          tone={
                            mentor.verificationStatus === "verified" ? "forest" : "neutral"
                          }
                        >
                          {mentor.verificationStatus === "verified"
                            ? "Verified Mentor"
                            : mentor.verificationStatus === "reviewed"
                              ? "Reviewed"
                              : "Registered"}
                        </Badge>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-interlink-muted">
                        {mentor.biography}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {mentor.expertiseTags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-interlink-border/70 pt-4">
                      <span className="text-xs text-interlink-muted">
                        {mentor.yearsOfExperience}+ yrs experience
                      </span>
                      <Link
                        href={`/mentors/${mentor.userId}`}
                        className="text-xs font-semibold text-interlink-forest hover:underline"
                      >
                        View Profile &rarr;
                      </Link>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal delayMs={80}>
              <div className="mt-8 rounded-[2px] border border-interlink-border bg-interlink-surface p-8 shadow-subtle">
                <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-base font-semibold text-interlink-ink">
                      Mentor profiles appear here as professionals complete onboarding
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-interlink-muted">
                      Explore the full directory or join Interlink as a Mentor to share your
                      industry expertise with aspiring professionals.
                    </p>
                  </div>
                  <Link
                    href="/mentors"
                    className="rounded-[2px] bg-interlink-forest px-5 py-2.5 text-sm font-medium text-white shadow-subtle transition-colors duration-200 hover:bg-interlink-forest-hover"
                  >
                    Open Mentor Directory
                  </Link>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* TRUST, CREDIBILITY & GOALS */}
      <section className="border-t border-interlink-border bg-interlink-forest-deep py-16 text-white">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Three-Tier Mentor Verification",
                body: "Interlink clearly distinguishes Registered Mentors, Reviewed Profiles, and Verified Mentors with administrative audit trails and safety reporting.",
              },
              {
                icon: Target,
                title: "Goal & Milestone Accountability",
                body: "Every accepted mentorship launches a dedicated workspace with goals, dated milestones, progress evidence, and structured mentor feedback.",
              },
              {
                icon: Compass,
                title: "Accessible Core Mentorship",
                body: "Built to make structured guidance accessible to students, recent graduates, career changers, and aspiring entrepreneurs everywhere.",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delayMs={idx * 90}>
                  <div className="h-full border border-white/15 bg-white/5 p-6 transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.08]">
                    <Icon className="h-6 w-6 text-interlink-gold" />
                    <h3 className="mt-4 font-display text-lg font-medium">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delayMs={180}>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-white/15 pt-8 text-xs text-white/80">
              <div className="flex flex-wrap items-center gap-6">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-interlink-gold" /> Free core mentorship
                  access
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-interlink-gold" /> Capacity-protected
                  mentors
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-interlink-gold" /> Private &amp;
                  safeguarded workspaces
                </span>
              </div>
              <Link
                href="/legal/guidelines"
                className="font-medium text-white underline-offset-4 hover:underline"
              >
                Read Community Guidelines &rarr;
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicShell>
  );
}
