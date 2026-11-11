"use client";

import React from "react";
import Link from "next/link";
import type { SessionUser } from "@interlink/types";
import { Button } from "@/components/ui/Button";
import { useAuthModal } from "@/features/auth/ui/AuthModalProvider";

export function LandingHeroActions({ user }: { user: SessionUser | null }) {
  const { openSignIn } = useAuthModal();

  return (
    <div className="mt-9 flex flex-wrap items-center gap-4">
      {user ? (
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-[2px] border border-interlink-hairline bg-interlink-surface px-7 py-2.5 text-sm font-medium text-interlink-ink shadow-subtle transition-all duration-200 hover:border-interlink-forest hover:text-interlink-forest hover:shadow-elevated focus-ring"
        >
          Go to Dashboard
        </Link>
      ) : (
        <Button
          variant="outline"
          size="lg"
          onClick={openSignIn}
          className="px-8 py-2.5 text-sm"
        >
          Get Started
        </Button>
      )}

      <Link
        href="/learn"
        className="inline-flex items-center justify-center rounded-[2px] border border-interlink-forest bg-interlink-forest px-7 py-2.5 text-sm font-medium text-white shadow-subtle transition-all duration-200 hover:bg-interlink-forest-hover hover:shadow-elevated focus-ring"
      >
        View Career Path
      </Link>
    </div>
  );
}
