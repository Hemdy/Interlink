import Link from "next/link";
import { Calendar, CheckCircle2, ShieldCheck, Sliders, Users } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge, Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";

const mentorBenefits = [
  {
    icon: Sliders,
    title: "Full Capacity & Availability Control",
    body: "Set your maximum active mentees, publish preferred weekly slots, and pause incoming requests anytime.",
  },
  {
    icon: Users,
    title: "Structured Request Screening",
    body: "Every mentee request includes their career objectives, expected outcomes, and why they chose you—no vague cold messages.",
  },
  {
    icon: ShieldCheck,
    title: "Three-Tier Credibility Verification",
    body: "Progress transparently from Registered Mentor to Reviewed Profile and Verified Mentor based on professional background checks.",
  },
  {
    icon: Calendar,
    title: "Conflict-Free Session Scheduling",
    body: "Confirm proposed times, add Zoom or Google Meet links, and keep track of session summaries inside dedicated workspaces.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create Your Mentor Account",
    description: "Register as a Mentor and verify your email address in minutes.",
  },
  {
    step: "02",
    title: "Complete Your Professional Profile",
    description:
      "Share your industry, expertise areas, mentorship approach, spoken languages, and capacity.",
  },
  {
    step: "03",
    title: "Undergo Profile Review & Verification",
    description:
      "Submit your LinkedIn or portfolio reference so administrators can review and verify your profile.",
  },
  {
    step: "04",
    title: "Guide Mentees With Structure",
    description:
      "Accept aligned requests, establish measurable goals, and track progress through completion.",
  },
];

export default async function BecomeMentorPage() {
  const user = await getCurrentUser();

  return (
    <PublicShell user={user}>
      {/* Spacious Hero Section */}
      <section className="border-b border-interlink-border bg-interlink-surface py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <div className="animate-hero-up max-w-3xl">
            <Badge tone="forest">For Experienced Professionals &amp; Founders</Badge>
            <h1 className="mt-4 font-display text-3xl font-light leading-tight text-interlink-ink sm:text-4xl lg:text-[42px]">
              Share your experience through structured, capacity-protected mentorship.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-interlink-muted">
              Interlink gives experienced practitioners, leaders, and entrepreneurs a calm,
              purpose-built workspace to mentor emerging talent on their own schedule—without
              unstructured inbox noise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link
                href={user ? "/profile" : "/sign-up?role=mentor"}
                className="rounded-[2px] bg-interlink-forest px-6 py-2.5 text-sm font-medium text-white shadow-subtle transition-all duration-200 hover:bg-interlink-forest-hover hover:shadow-elevated"
              >
                {user ? "Manage Mentor Profile" : "Join as a Mentor"}
              </Link>
              <Link
                href="/mentors"
                className="rounded-[2px] border border-interlink-hairline bg-interlink-surface px-6 py-2.5 text-sm font-medium text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
              >
                Explore Mentor Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mentor Value Pillars */}
      <section className="border-b border-interlink-border bg-interlink-app-bg py-16 sm:py-20">
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <Reveal>
            <h2 className="font-display text-2xl font-light text-interlink-ink sm:text-3xl">
              Designed to respect your time and amplify your impact
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {mentorBenefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <Reveal key={benefit.title} delayMs={idx * 75} className="h-full">
                  <Card elevated className="h-full p-6 hover:-translate-y-0.5 hover:border-interlink-forest/40">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-interlink-forest/20 bg-interlink-app-bg text-interlink-forest">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold text-interlink-ink">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-interlink-muted">
                      {benefit.body}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4-Step Mentor Journey */}
      <section className="bg-interlink-canvas py-16 sm:py-20">
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
              Onboarding Pathway
            </p>
            <h2 className="mt-2 font-display text-2xl font-light text-interlink-ink sm:text-3xl">
              How becoming a mentor works
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item, idx) => (
              <Reveal key={item.step} delayMs={idx * 75} className="h-full">
                <Card className="h-full p-5 hover:-translate-y-0.5 hover:border-interlink-forest/40">
                  <span className="text-xs font-semibold tracking-widest text-interlink-gold">
                    STEP {item.step}
                  </span>
                  <h3 className="mt-2 font-display text-base font-semibold text-interlink-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-interlink-muted">
                    {item.description}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={160}>
            <Card elevated className="mt-12 border-l-4 border-l-interlink-forest p-6 sm:p-8">
              <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-interlink-forest" />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-interlink-ink">
                      Ready to guide your first mentee?
                    </h3>
                    <p className="mt-1 text-sm text-interlink-muted">
                      Joining Interlink as a Mentor is free, and you stay in complete control of
                      your availability.
                    </p>
                  </div>
                </div>
                <Link
                  href={user ? "/profile" : "/sign-up?role=mentor"}
                  className="shrink-0 rounded-[2px] bg-interlink-forest px-6 py-2.5 text-sm font-medium text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
                >
                  {user ? "Go to Mentor Profile" : "Apply as a Mentor"}
                </Link>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </PublicShell>
  );
}
