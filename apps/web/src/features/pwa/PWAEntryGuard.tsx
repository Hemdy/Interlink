"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isInstalledPWA } from "./useNavigationMode";

/**
 * Ensures installed PWA entry never displays the public website homepage (/).
 * Has zero effect in standard browser sessions so browser users go directly to the website.
 */
export function PWAEntryGuard({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isInstalledPWA()) return;
    router.replace(isAuthenticated ? "/dashboard" : "/sign-in");
  }, [isAuthenticated, router]);

  return null;
}
