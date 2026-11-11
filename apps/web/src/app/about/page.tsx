import Link from "next/link";
import { CheckCircle2, Compass, ShieldCheck, Users } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Card } from "@/components/ui/Card";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";

const principles = [
  {
    title: "Accessibility",
    body: "Professional mentorship should not depend on privileged access to exclusive networks.",
  },
  {
    title: "Credibility",
    body: "Transparent mentor profiles, career history, and three-tier verification establish genuine trust.",
  },
  {
    title: "Compatibility",
    body: "Matching considers industry relevance, expertise, career objectives, language, and availability.",
  },
  {
    title: "Accountability",
    body: "Every mentorship relationship revolves around agreed objectives, scheduled sessions, and milestones.",
  },
  {
    title: "Growth",
    body: "Progress reviews and documented outcomes replace superficial networking metrics.",
  },
  {
    title: "Safety",
    body: "Community guidelines, reporting, user blocking, and administrative moderation protect participants.",
  },
];

export default async function AboutPage() {
  const user = await getCurrentUser();

  return (
    <PublicShell user={user}>
      <section className="border-b border-interlink-border bg-interlink-surface py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="animate-hero-up lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
                About Interlink
              </p>
              <h1 className="mt-3 font-display text-3xl font-light leading-tight text-interlink-ink sm:text-4xl">
                Where experience meets ambition through structured, accountable mentorship.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-interlink-muted">
                Interlink connects university students, recent graduates, early-career
                professionals, career changers, and aspiring entrepreneurs with experienced
                industry practitioners committed to sharing practical guidance.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/mentors"
                  className="rounded-[2px] bg-interlink-forest px-5 py-2.5 text-sm font-medium text-white hover:bg-interlink-forest-hover"
                >
                  Browse Mentors
                </Link>
                <Link
                  href="/learn"
                  className="rounded-[2px] border border-interlink-hairline bg-interlink-surface px-5 py-2.5 text-sm font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                >
                  Explore Career Paths
                </Link>
              </div>
            </div>

            <div className="animate-hero-card bg-interlink-forest-card px-8 py-12 shadow-card lg:col-span-5">
              <InterlinkLogo variant="card" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-interlink-app-bg py-16">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <Compass className="h-5 w-5 text-interlink-forest" />
              <h2 className="mt-3 font-display text-xl font-semibold text-interlink-ink">
                Our Vision
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-interlink-muted">
                To become a trusted digital ecosystem that connects people with the guidance,
                knowledge, and professional relationships they need to unlock their potential and
                achieve meaningful career growth.
              </p>
            </Card>
            <Card>
              <Users className="h-5 w-5 text-interlink-forest" />
              <h2 className="mt-3 font-display text-xl font-semibold text-interlink-ink">
                Our Mission
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-interlink-muted">
                To make mentorship accessible, intentional, and impactful by connecting aspiring
                individuals with experienced professionals through structured relationships that
                promote learning, accountability, and professional advancement.
              </p>
            </Card>
          </div>

          <h2 className="mt-14 font-display text-2xl font-light text-interlink-ink">
            Six Operating Principles
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, idx) => (
              <Reveal key={p.title} delayMs={idx * 70} className="h-full">
                <Card className="h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-interlink-forest/40">
                  <div className="flex items-center gap-2 text-interlink-forest">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <h3 className="font-semibold text-interlink-ink">{p.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-interlink-muted">{p.body}</p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Card elevated className="mt-12 border-interlink-forest/25">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-interlink-forest" />
                <div>
                  <h3 className="font-display text-lg font-semibold text-interlink-ink">
                    Trust, Boundaries &amp; Safeguarding
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-interlink-muted">
                    Verification status is never sold or guaranteed. Mentors control their
                    capacity and availability, and every participant agrees to our Community
                    Guidelines.
                  </p>
                </div>
              </div>
              <Link
                href="/legal/guidelines"
                className="shrink-0 rounded-[2px] border border-interlink-hairline px-4 py-2 text-xs font-medium text-interlink-ink hover:border-interlink-forest hover:text-interlink-forest"
              >
                Read Community Guidelines
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
