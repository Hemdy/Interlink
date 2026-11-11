import Link from "next/link";
import { Check, Info } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge, Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/session";

export default async function MembershipPage() {
  const user = await getCurrentUser();

  return (
    <PublicShell user={user}>
      <section className="border-b border-interlink-border bg-interlink-surface py-20 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <div className="animate-hero-up">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
              Membership &amp; Access
            </p>
            <h1 className="mt-3 font-display text-3xl font-light text-interlink-ink sm:text-4xl lg:text-[42px]">
              Accessible mentorship first — built for genuine career outcomes.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-interlink-muted">
              Per the Interlink Product Charter, core mentorship is completely free during our
              initial release so students, graduates, career changers, and experienced mentors can
              build trusted relationships without barriers.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-interlink-app-bg py-16">
        <div className="mx-auto max-w-[1100px] px-6 sm:px-10">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Free Mentee Access */}
            <Card elevated className="flex flex-col justify-between border-t-4 border-t-interlink-forest">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-interlink-ink">
                    Mentee Account
                  </h2>
                  <Badge tone="forest">Active Now &middot; Free</Badge>
                </div>
                <p className="mt-3 text-3xl font-light text-interlink-forest">
                  &#8358;0 <span className="text-xs text-interlink-muted">/ month</span>
                </p>
                <p className="mt-2 text-sm text-interlink-muted">
                  Everything you need to discover verified mentors and track measurable goals.
                </p>

                <ul className="mt-6 space-y-3 text-sm text-interlink-ink/85">
                  {[
                    "Structured mentee profile and onboarding",
                    "Searchable mentor directory with industry & expertise filters",
                    "Rule-based compatibility recommendations",
                    "Dedicated mentorship workspaces with goals & milestones",
                    "Session scheduling & private workspace messaging",
                    "Safety reporting and privacy controls",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href={user ? "/mentors" : "/sign-up"}
                  className="block w-full rounded-[2px] bg-interlink-forest py-2.5 text-center text-sm font-medium text-white hover:bg-interlink-forest-hover"
                >
                  {user ? "Browse Mentors" : "Create Free Mentee Account"}
                </Link>
              </div>
            </Card>

            {/* Free Mentor Access */}
            <Card elevated className="flex flex-col justify-between border-t-4 border-t-interlink-gold">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-interlink-ink">
                    Mentor Account
                  </h2>
                  <Badge tone="gold">Active Now &middot; Free</Badge>
                </div>
                <p className="mt-3 text-3xl font-light text-interlink-ink">
                  &#8358;0 <span className="text-xs text-interlink-muted">/ month</span>
                </p>
                <p className="mt-2 text-sm text-interlink-muted">
                  Full mentorship management tools with capacity and availability protection.
                </p>

                <ul className="mt-6 space-y-3 text-sm text-interlink-ink/85">
                  {[
                    "Credible professional profile with 3-tier verification pathway",
                    "Custom weekly availability slots & active mentee capacity limits",
                    "One-click pause when your schedule is full",
                    "Structured request screening (Accept, Decline, or Request Info)",
                    "Goal review, milestone feedback & session tracking",
                    "Verified impact history across completed mentorships",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href={user ? "/profile" : "/sign-up?role=mentor"}
                  className="block w-full rounded-[2px] border border-interlink-hairline bg-interlink-surface py-2.5 text-center text-sm font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                >
                  {user ? "Manage Mentor Profile" : "Join as a Mentor"}
                </Link>
              </div>
            </Card>
          </div>

          <Card elevated className="mt-8">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-interlink-forest" />
              <div>
                <h3 className="text-sm font-semibold text-interlink-ink">
                  Future Institutional &amp; Sponsored Programmes (Phase 2)
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-interlink-muted">
                  Universities, NGOs, and corporate teams will be able to sponsor structured
                  mentorship cohorts on Interlink. Core free mentorship for individuals will
                  always remain available, and mentor verification will never depend on payment.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </PublicShell>
  );
}
