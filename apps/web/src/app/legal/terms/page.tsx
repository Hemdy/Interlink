import Link from "next/link";
import { PublicShell } from "@/components/layout/PublicShell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function TermsPage() {
  const user = await getCurrentUser();
  return (
    <PublicShell user={user}>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
          Legal &amp; Governance
        </p>
        <h1 className="mt-2 font-display text-3xl font-light text-interlink-ink">
          Terms and Conditions
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-interlink-muted">
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">1. Purpose of Interlink</h2>
            <p className="mt-1.5">
              Interlink provides a structured mentorship and career development workspace
              connecting mentees and mentors. Mentorship guidance does not constitute formal
              legal, medical, therapeutic, or regulated financial advice, nor does it guarantee
              employment or commercial outcomes.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">2. Account Integrity</h2>
            <p className="mt-1.5">
              Users must provide accurate professional, academic, and identity details. Mentor
              verification reflects submitted credential checks and does not represent an
              endorsement or guarantee of future conduct.
            </p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">
              3. Professional Conduct &amp; Boundaries
            </h2>
            <p className="mt-1.5">
              All participants must uphold respectful communication, protect shared confidential
              information, avoid unsolicited financial requests, and follow our{" "}
              <Link href="/legal/guidelines" className="text-interlink-link underline">
                Community Guidelines
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
