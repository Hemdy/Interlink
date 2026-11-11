import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Handshake,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { getCurrentUser } from "@/lib/auth/session";

const guidelineSections = [
  {
    category: "1. Respect & Professional Conduct",
    icon: Handshake,
    summary: "Keep every interaction constructive, inclusive, and focused on professional growth.",
    items: [
      {
        title: "Mutual Respect",
        detail: "Treat mentors, mentees, and staff courteously regardless of background or career stage.",
      },
      {
        title: "Zero Harassment or Discrimination",
        detail:
          "Harassment, hate speech, intimidation, or discriminatory remarks are strictly prohibited.",
      },
      {
        title: "Healthy Boundaries",
        detail:
          "Maintain clear professional boundaries; mentorship does not substitute for therapy, legal, or financial advice.",
      },
    ],
  },
  {
    category: "2. Credibility & Honest Representation",
    icon: BadgeCheck,
    summary: "Platform trust relies on accurate identity, experience, and verification claims.",
    items: [
      {
        title: "Accurate Credentials",
        detail: "Do not misrepresent job titles, academic qualifications, or past employers.",
      },
      {
        title: "Verification Integrity",
        detail:
          "Never claim Verified Mentor status unless approved through Interlink's formal verification review.",
      },
      {
        title: "No False Guarantees",
        detail:
          "Mentors guide and advise; they are not responsible for guaranteeing employment or commercial outcomes.",
      },
    ],
  },
  {
    category: "3. Confidentiality & Privacy",
    icon: Lock,
    summary: "Protect sensitive career discussions and personal information inside workspaces.",
    items: [
      {
        title: "Respect Workspace Privacy",
        detail:
          "Keep shared career challenges, CV feedback, and private messages confidential unless permission is granted.",
      },
      {
        title: "Protect Sensitive Data",
        detail:
          "Never request or share passwords, bank details, government IDs, or private contact credentials unnecessarily.",
      },
      {
        title: "Intellectual Property",
        detail:
          "Credit original work and avoid sharing proprietary company materials without authorisation.",
      },
    ],
  },
  {
    category: "4. Accountability & Commitments",
    icon: CalendarClock,
    summary: "Consistent preparation and communication keep mentorships productive.",
    items: [
      {
        title: "Honour Scheduled Sessions",
        detail: "Attend confirmed sessions on time and provide early notice when rescheduling is needed.",
      },
      {
        title: "Respect Mentor Capacity",
        detail:
          "Accept availability limits gracefully; mentors manage active mentee slots to preserve guidance quality.",
      },
      {
        title: "Intentional Closure",
        detail:
          "Use workspace completion tools to summarise progress and close or renew relationships respectfully.",
      },
    ],
  },
  {
    category: "5. Safety, Solicitation & Reporting",
    icon: ShieldAlert,
    summary: "Safeguarding tools protect members from unsolicited commercial pressure or misconduct.",
    items: [
      {
        title: "No Inappropriate Solicitation",
        detail:
          "Do not pressure mentees into unapproved paid services, pyramid schemes, or personal favours.",
      },
      {
        title: "Report Suspicious Activity",
        detail:
          "Use the built-in Report button on profiles or contact support if you observe impersonation or unsafe conduct.",
      },
      {
        title: "Blocking & Moderation",
        detail:
          "Members may block another user immediately; administrators review reports and enforce suspensions where required.",
      },
    ],
  },
];

export default async function GuidelinesPage() {
  const user = await getCurrentUser();

  return (
    <PublicShell user={user}>
      {/* Header */}
      <section className="border-b border-interlink-border bg-interlink-surface py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <div className="animate-hero-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
              Trust &amp; Safety Governance
            </p>
            <h1 className="mt-2 font-display text-3xl font-light text-interlink-ink sm:text-4xl">
              Community Guidelines
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-interlink-muted">
              Every member agrees to uphold these standards so Interlink remains a safe, respectful,
              and outcome-driven environment for structured mentorship.
            </p>
          </div>
        </div>
      </section>

      {/* Alternating Categorised Guideline Sections */}
      {guidelineSections.map((section, sectionIdx) => {
        const Icon = section.icon;
        const isAlt = sectionIdx % 2 === 0;
        return (
          <section
            key={section.category}
            className={`border-b border-interlink-border py-12 sm:py-14 ${
              isAlt ? "bg-interlink-app-bg" : "bg-interlink-canvas"
            }`}
          >
            <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
              <Reveal>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[2px] border border-interlink-forest/25 bg-interlink-surface text-interlink-forest shadow-subtle">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-interlink-ink">
                      {section.category}
                    </h2>
                    <p className="mt-1 text-sm text-interlink-muted">{section.summary}</p>
                  </div>
                </div>
              </Reveal>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {section.items.map((item, itemIdx) => (
                  <Reveal key={item.title} delayMs={itemIdx * 80} className="h-full">
                    <Card className="h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-interlink-forest/40">
                      <h3 className="text-sm font-semibold text-interlink-ink">{item.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-interlink-muted">
                        {item.detail}
                      </p>
                    </Card>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Reporting & Resolution Process */}
      <section className="bg-interlink-canvas py-14">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <Reveal>
            <Card elevated className="border-interlink-forest/25 bg-interlink-app-bg p-6 sm:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="flex items-start gap-3.5">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-interlink-forest" />
                  <div>
                    <h2 className="font-display text-lg font-semibold text-interlink-ink">
                      How Safety Reports Are Handled
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-interlink-muted">
                      Reports are logged with timestamps, reviewed by authorised administrators, and
                      resolved with documented outcomes—ranging from formal warnings to account
                      suspension—while preserving audit records.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-3">
                  <Link
                    href="/legal/terms"
                    className="rounded-[2px] border border-interlink-hairline bg-interlink-surface px-4 py-2 text-xs font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                  >
                    Terms &amp; Conditions
                  </Link>
                  <Link
                    href="/mentors"
                    className="rounded-[2px] bg-interlink-forest px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-interlink-forest-hover"
                  >
                    Browse Mentors
                  </Link>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-interlink-border pt-4 text-xs text-interlink-muted">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  If you encounter urgent misconduct, use the <strong>Report profile</strong> and{" "}
                  <strong>Block user</strong> tools directly on any member&apos;s profile page.
                </span>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </PublicShell>
  );
}
