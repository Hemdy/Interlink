"use client";

import { useEffect } from "react";

export function purgeServiceWorkerAuthCache() {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "PURGE_AUTH_CACHE" });
  }

  // Also remove any non-precache Cache Storage entries directly on the client
  if ("caches" in window) {
    void window.caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !name.startsWith("interlink-dashboard-v"))
            .map((name) => window.caches.delete(name)),
        ),
      )
      .catch(() => undefined);
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register service worker with root scope to enable offline fallback
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("Service worker registration skipped or failed:", err);
      });
  }, []);

  return null;
}
