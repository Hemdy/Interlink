import React from "react";
import Link from "next/link";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";

export function PublicFooter() {
  return (
    <footer className="border-t border-interlink-border bg-interlink-surface">
      <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <InterlinkLogo />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-interlink-muted">
              Get Linked with experienced mentors who can guide you as you advance in your career
              journey. Structured goals, credible verification, and measurable growth.
            </p>
            <p className="mt-4 text-xs font-medium tracking-wide text-interlink-forest">
              Connection &middot; Empowerment &middot; Growth
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-interlink-ink">
              Platform
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-interlink-muted">
              <li>
                <Link href="/mentors" className="transition-colors hover:text-interlink-forest">
                  Browse Mentors
                </Link>
              </li>
              <li>
                <Link
                  href="/become-a-mentor"
                  className="transition-colors hover:text-interlink-forest"
                >
                  Become a Mentor
                </Link>
              </li>
              <li>
                <Link href="/learn" className="transition-colors hover:text-interlink-forest">
                  Career Paths &amp; Learn
                </Link>
              </li>
              <li>
                <Link href="/membership" className="transition-colors hover:text-interlink-forest">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-interlink-forest">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-interlink-ink">
              Governance &amp; Policies
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-interlink-muted">
              <li>
                <Link href="/legal/terms" className="transition-colors hover:text-interlink-forest">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="transition-colors hover:text-interlink-forest"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cookies"
                  className="transition-colors hover:text-interlink-forest"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/guidelines"
                  className="transition-colors hover:text-interlink-forest"
                >
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-interlink-border pt-6 text-xs text-interlink-muted sm:flex-row sm:items-center">
          <p>&copy; {new Date().getFullYear()} Interlink. All rights reserved.</p>
          <p>Structured Mentorship &amp; Career Development Ecosystem</p>
        </div>
      </div>
    </footer>
  );
}
