import { PublicShell } from "@/components/layout/PublicShell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function CookiesPage() {
  const user = await getCurrentUser();
  return (
    <PublicShell user={user}>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
          Legal &amp; Governance
        </p>
        <h1 className="mt-2 font-display text-3xl font-light text-interlink-ink">
          Cookie Policy
        </h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-interlink-muted">
          <section>
            <h2 className="text-base font-semibold text-interlink-ink">
              Essential Session Cookies
            </h2>
            <p className="mt-1.5">
              Interlink uses a strictly necessary, HTTP-only authentication cookie (
              <code>interlink_session</code>) to maintain your signed-in session securely across
              requests. We do not use third-party advertising trackers.
            </p>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
