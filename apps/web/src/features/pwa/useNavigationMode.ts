"use client";

import { useEffect, useState } from "react";

export interface NavigationModeState {
  isStandalone: boolean;
  useBottomNav: boolean;
}

export function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
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
        setState((prev) =>
          !prev.isStandalone && !prev.useBottomNav
            ? prev
            : { isStandalone: false, useBottomNav: false },
        );
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

      setState((prev) =>
        prev.isStandalone === true && prev.useBottomNav === useBottomNav
          ? prev
          : { isStandalone: true, useBottomNav },
      );
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

const UNREAD_SYNC_EVENT = "interlink:unread-sync";
const UNREAD_CACHE_TTL_MS = 60_000;

let cachedUnreadMessages = 0;
let lastUnreadFetchAt = 0;
let cachedUnreadNotifications: number | null = null;
let lastNotifFetchAt = 0;

function emitUnreadSync() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UNREAD_SYNC_EVENT));
}

export function resetNavigationUnreadCaches() {
  cachedUnreadMessages = 0;
  lastUnreadFetchAt = 0;
  cachedUnreadNotifications = null;
  lastNotifFetchAt = 0;
  emitUnreadSync();
}

export function setOptimisticUnreadNotifications(
  nextOrUpdater: number | ((prev: number) => number),
) {
  const prev = cachedUnreadNotifications ?? 0;
  cachedUnreadNotifications = Math.max(
    0,
    typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater,
  );
  lastNotifFetchAt = Date.now();
  emitUnreadSync();
}

export function setOptimisticUnreadMessages(
  nextOrUpdater: number | ((prev: number) => number),
) {
  cachedUnreadMessages = Math.max(
    0,
    typeof nextOrUpdater === "function"
      ? nextOrUpdater(cachedUnreadMessages)
      : nextOrUpdater,
  );
  lastUnreadFetchAt = Date.now();
  emitUnreadSync();
}

export function useUnreadNotificationsCount(
  enabled: boolean,
  initialServerCount?: number,
): number {
  const [unreadNotifications, setUnreadNotifications] = useState(() => {
    if (cachedUnreadNotifications === null && typeof initialServerCount === "number") {
      cachedUnreadNotifications = initialServerCount;
      lastNotifFetchAt = Date.now();
    }
    return cachedUnreadNotifications ?? initialServerCount ?? 0;
  });

  useEffect(() => {
    if (cachedUnreadNotifications === null && typeof initialServerCount === "number") {
      cachedUnreadNotifications = initialServerCount;
      lastNotifFetchAt = Date.now();
      setUnreadNotifications(initialServerCount);
    }
  }, [initialServerCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSync = () => {
      if (cachedUnreadNotifications !== null) {
        setUnreadNotifications(cachedUnreadNotifications);
      }
    };
    window.addEventListener(UNREAD_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(UNREAD_SYNC_EVENT, handleSync);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const controller = new AbortController();

    async function fetchUnreadIfStale() {
      if (Date.now() - lastNotifFetchAt < UNREAD_CACHE_TTL_MS) {
        return;
      }
      try {
        const res = await fetch("/api/v1/notifications", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as {
            data?: { notifications?: Array<{ isRead: boolean }> };
          };
          if (Array.isArray(json.data?.notifications)) {
            cachedUnreadNotifications = json.data.notifications.filter((n) => !n.isRead).length;
            lastNotifFetchAt = Date.now();
            setUnreadNotifications(cachedUnreadNotifications);
          }
        }
      } catch {
        // Ignore network/abort errors cleanly
      }
    }

    void fetchUnreadIfStale();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadIfStale();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);

  return unreadNotifications;
}

export function useUnreadMessagesCount(enabled: boolean): number {
  const [unreadMessages, setUnreadMessages] = useState(cachedUnreadMessages);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSync = () => setUnreadMessages(cachedUnreadMessages);
    window.addEventListener(UNREAD_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(UNREAD_SYNC_EVENT, handleSync);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const controller = new AbortController();

    async function fetchUnreadIfStale() {
      if (Date.now() - lastUnreadFetchAt < UNREAD_CACHE_TTL_MS) {
        return;
      }
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
            cachedUnreadMessages = json.data.totalUnreadMessages;
            lastUnreadFetchAt = Date.now();
            setUnreadMessages(cachedUnreadMessages);
          }
        }
      } catch {
        // Ignore network/abort errors cleanly
      }
    }

    void fetchUnreadIfStale();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchUnreadIfStale();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);

  return unreadMessages;
}
