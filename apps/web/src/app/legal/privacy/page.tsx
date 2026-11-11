import { PublicShell } from "@/components/layout/PublicShell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function PrivacyPage() {
  const user = await getCurrentUser();
  return (
    <PublicShell user={user}>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
          Legal &amp; Governance
        </p>
        <h1 className="mt-2 font-display text-3xl font-light text-interlink-ink">
          Privacy Policy
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-interlink-muted">
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">
              1. Information We Collect
            </h2>
            <p className="mt-1.5">
              Interlink collects account registration details (name, email, password hash),
              role-specific profile information, mentorship requests, goals, milestones, scheduled
              sessions, and private workspace messages needed to deliver the mentorship lifecycle.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">
              2. Visibility &amp; Private Workspaces
            </h2>
            <p className="mt-1.5">
              Users control profile visibility settings (Public, Members Only, or Private).
              Mentorship workspace messages and private mentor feedback are restricted strictly to
              authorised relationship participants and never exposed on public profiles.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">
              3. Retention &amp; Account Deactivation
            </h2>
            <p className="mt-1.5">
              You can request account deactivation at any time from your account settings. Safety
              reports and administrative audit records may be retained where required for platform
              integrity and legal compliance.
            </p>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
