"use client";

import { useEffect } from "react";
import { purgeServiceWorkerAuthCache } from "@/features/pwa/ServiceWorkerRegister";
import { resetNavigationUnreadCaches } from "@/features/pwa/useNavigationMode";

const AUTH_CHANNEL_NAME = "interlink_auth";
const AUTH_EPOCH_STORAGE_KEY = "interlink_auth_epoch";

/**
 * Broadcasts that authentication state changed in this tab/PWA window without storing any PII or tokens.
 */
export function notifyAuthStateChanged() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(AUTH_EPOCH_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore restricted storage contexts
  }

  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.postMessage({ type: "auth-changed" });
      channel.close();
    } catch {
      // Ignore BroadcastChannel errors in unsupported contexts
    }
  }
}

/**
 * Clears in-memory & service worker caches, notifies sibling tabs, and performs a hard navigation
 * so Next.js client Router Cache and React state from the previous session cannot persist.
 */
export function resetClientSessionAndNavigate(targetUrl: string) {
  resetNavigationUnreadCaches();
  purgeServiceWorkerAuthCache();
  notifyAuthStateChanged();
  window.location.replace(targetUrl);
}

/**
 * Keeps browser tabs and installed PWA windows synchronized with the server-side HttpOnly session.
 * Prevents stale authenticated UI from remaining visible across tabs, BFCache restores, or user switches.
 */
export function SessionSyncGuard({
  expectedUserId,
  redirectOnUnauthenticated = false,
}: {
  expectedUserId: string | null;
  redirectOnUnauthenticated?: boolean;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let checking = false;

    async function verifySessionParity() {
      if (checking) return;
      checking = true;
      try {
        const res = await fetch("/api/v1/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        let serverUserId: string | null = null;
        if (res.ok) {
          const json = (await res.json()) as { data?: { user?: { id?: string } } };
          serverUserId = json.data?.user?.id ?? null;
        }

        if (serverUserId !== expectedUserId) {
          resetNavigationUnreadCaches();
          purgeServiceWorkerAuthCache();

          if (redirectOnUnauthenticated && !serverUserId) {
            window.location.replace("/sign-in");
            return;
          }
          window.location.replace(window.location.pathname + window.location.search);
        }
      } catch {
        // Ignore transient network errors
      } finally {
        checking = false;
      }
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        void verifySessionParity();
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === AUTH_EPOCH_STORAGE_KEY) {
        void verifySessionParity();
      }
    }

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channel.onmessage = () => {
          void verifySessionParity();
        };
      } catch {
        channel = null;
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [expectedUserId, redirectOnUnauthenticated]);

  return null;
}
