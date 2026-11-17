"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "interlink_pwa_dismissed_until";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true until hydrated
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const isRunningStandalone =
      mediaQuery.matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://");

    setIsStandalone(isRunningStandalone);

    // Check iOS Safari
    const ua = window.navigator.userAgent;
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isSafari =
      /Safari/.test(ua) &&
      !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
    setIsIOS(isAppleDevice && isSafari && !isRunningStandalone);

    // Check dismissal status in localStorage
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }

    // Capture beforeinstallprompt event for Chromium browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Installation prompt failed:", err);
    }
  };

  const dismissPrompt = () => {
    try {
      const expiry = Date.now() + DISMISS_DURATION_MS;
      localStorage.setItem(STORAGE_KEY, String(expiry));
    } catch {
      // ignore storage error
    }
    setIsDismissed(true);
  };

  // Determine whether to display the prompt:
  // - Must not already be standalone
  // - Must not be dismissed
  // - Either canInstall is true (Chromium beforeinstallprompt) OR is iOS Safari
  const shouldShowPrompt = !isStandalone && !isDismissed && (canInstall || isIOS);

  return {
    canInstall,
    isStandalone,
    isIOS,
    shouldShowPrompt,
    promptInstall,
    dismissPrompt,
  };
}
