"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const tricklerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (tricklerRef.current) {
      clearInterval(tricklerRef.current);
      tricklerRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  };

  // Complete bar whenever route finishes navigating
  useEffect(() => {
    clearTimers();
    setProgress(100);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 180);

    return () => clearTimers();
  }, [pathname, searchParams]);

  // Listen for internal link clicks to provide immediate 0ms navigation feedback
  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      try {
        const destUrl = new URL(anchor.href, window.location.href);
        if (destUrl.origin !== window.location.origin) return;

        // Skip if same URL (only hash changed or identical)
        if (
          destUrl.pathname === window.location.pathname &&
          destUrl.search === window.location.search
        ) {
          return;
        }

        clearTimers();
        setVisible(true);
        setProgress(22);

        tricklerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 88) return prev;
            const step = prev < 50 ? 12 : prev < 75 ? 6 : 2;
            return Math.min(88, prev + step);
          });
        }, 120);

        // Safety cleanup in case navigation is aborted
        safetyTimeoutRef.current = setTimeout(() => {
          clearTimers();
          setVisible(false);
          setProgress(0);
        }, 8000);
      } catch {
        // Ignore malformed URLs
      }
    }

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      clearTimers();
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[9995] h-[2.5px] transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-interlink-forest via-emerald-400 to-interlink-gold shadow-[0_0_8px_rgba(59,104,70,0.6)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  );
}
