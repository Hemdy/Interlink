"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export interface NavigationModeState {
  isStandalone: boolean;
  useBottomNav: boolean;
}

/**
 * Determines whether the application should display the installed PWA bottom navigation
 * or the standard website/desktop sidebar navigation according to environment:
 *
 * - Mobile browser / Tablet browser / Desktop website -> Existing sidebar navigation
 * - Installed mobile PWA -> Bottom navigation
 * - Installed tablet PWA -> Bottom navigation
 * - Desktop PWA with mobile-width viewport (< 1024px) -> Bottom navigation
 * - Desktop PWA with wider viewport (>= 1024px, non-touch) -> Existing sidebar
 */
export function useNavigationMode(): NavigationModeState {
  // Default to false for SSR hydration parity with standard browser output
  const [state, setState] = useState<NavigationModeState>({
    isStandalone: false,
    useBottomNav: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");

    const evaluate = () => {
      const isStandalone =
        standaloneQuery.matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.startsWith("android-app://");

      if (!isStandalone) {
        setState({ isStandalone: false, useBottomNav: false });
        return;
      }

      const width = window.innerWidth;
      const ua = window.navigator.userAgent;
      const isIPad =
        /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
      const isTouchTablet =
        (coarsePointerQuery.matches || isIPad) && width <= 1366;

      // Mobile-width viewport (< 1024px) or touch tablet in installed PWA uses bottom nav.
      // Desktop PWA with wider viewport (>= 1024px non-touch) retains desktop sidebar.
      const useBottomNav = width < 1024 || isTouchTablet;

      setState({ isStandalone: true, useBottomNav });
    };

    evaluate();

    window.addEventListener("resize", evaluate);
    standaloneQuery.addEventListener("change", evaluate);
    coarsePointerQuery.addEventListener("change", evaluate);

    return () => {
      window.removeEventListener("resize", evaluate);
      standaloneQuery.removeEventListener("change", evaluate);
      coarsePointerQuery.removeEventListener("change", evaluate);
    };
  }, []);

  return state;
}

export function useUnreadMessagesCount(enabled: boolean): number {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const controller = new AbortController();

    async function fetchUnread() {
      try {
        const res = await fetch("/api/v1/conversations", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            data?: { totalUnreadMessages?: number };
          };
          if (typeof json.data?.totalUnreadMessages === "number") {
            setUnreadMessages(json.data.totalUnreadMessages);
          }
        }
      } catch {
        // Ignore network/abort errors cleanly
      }
    }

    void fetchUnread();

    return () => controller.abort();
  }, [enabled, pathname]);

  return unreadMessages;
}
