"use client";

import { useEffect } from "react";

export function purgeServiceWorkerAuthCache() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "PURGE_AUTH_CACHE" });
    }
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Register service worker with root scope to enable dashboard caching and offline fallback
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Check for updates on page load
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("Service worker registration skipped or failed:", err);
      });
  }, []);

  return null;
}
