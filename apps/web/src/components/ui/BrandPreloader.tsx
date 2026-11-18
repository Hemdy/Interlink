"use client";

import React, { useEffect, useState } from "react";
import { isInstalledPWA } from "@/features/pwa/useNavigationMode";
import { InterlinkMark } from "./InterlinkLogo";

const PWA_SPLASH_SESSION_KEY = "il_pwa_splash_done";

export function BrandPreloader() {
  const [mounted, setMounted] = useState(false);
  const [isLightPhase, setIsLightPhase] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Only show blocking splash curtain for standalone installed PWA cold launches
    // so regular browser page loads render their LCP hero heading immediately.
    if (!isInstalledPWA()) {
      return;
    }

    try {
      if (window.sessionStorage.getItem(PWA_SPLASH_SESSION_KEY) === "1") {
        return;
      }
      window.sessionStorage.setItem(PWA_SPLASH_SESSION_KEY, "1");
    } catch {
      // Ignore storage failures in restricted contexts
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    setMounted(true);

    // Prevent background scrolling while preloader is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Transition smoothly from green opening screen to light background with dark branding
    const lightPhaseTimer = setTimeout(() => {
      setIsLightPhase(true);
    }, 600);

    // Begin graceful fade-out transition at 1.25 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      document.body.style.overflow = originalOverflow;
    }, 1250);

    // Completely unmount overlay from DOM at 1.65 seconds
    const unmountTimer = setTimeout(() => {
      setMounted(false);
    }, 1650);

    // Allow user to press Escape to dismiss early
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExiting(true);
        document.body.style.overflow = originalOverflow;
        setTimeout(() => setMounted(false), 300);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(lightPhaseTimer);
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes il-preloader-logo {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(12px);
            filter: blur(5px);
          }
          18% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }

        @keyframes il-preloader-name {
          0%, 18% {
            opacity: 0;
            transform: translateY(14px);
            letter-spacing: 0.14em;
          }
          40% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.24em;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            letter-spacing: 0.24em;
          }
        }

        @keyframes il-preloader-tagline {
          0%, 42% {
            opacity: 0;
            transform: translateY(10px);
          }
          64% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes il-preloader-progress {
          0% {
            width: 0%;
          }
          92% {
            width: 100%;
          }
          100% {
            width: 100%;
          }
        }

        @keyframes il-preloader-glow {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.65;
            transform: scale(1.05);
          }
        }

        .il-animate-logo {
          animation: il-preloader-logo 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-name {
          animation: il-preloader-name 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-tagline {
          animation: il-preloader-tagline 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-progress {
          animation: il-preloader-progress 1.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .il-animate-glow {
          animation: il-preloader-glow 2.5s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .il-animate-logo,
          .il-animate-name,
          .il-animate-tagline,
          .il-animate-progress,
          .il-animate-glow {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-label="Loading Interlink"
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none transition-all duration-700 ease-out ${
          isExiting
            ? "pointer-events-none scale-[1.015] opacity-0"
            : "pointer-events-auto scale-100 opacity-100"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, #FFFFFF 0%, #F5F7F5 58%, #E9F0EC 100%)",
        }}
      >
        <span className="sr-only">
          Interlink — Connection, Empowerment, Growth. Loading platform...
        </span>

        {/* Opening Full-Screen Forest Green Layer that smoothly fades out */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-[650ms] ease-in-out ${
            isLightPhase ? "opacity-0" : "opacity-100"
          }`}
          style={{
            background:
              "radial-gradient(ellipse at 50% 46%, #285438 0%, #1c3c28 55%, #102318 100%)",
          }}
        >
          {/* Ambient subtle emerald glow during green opening state */}
          <div className="flex h-full w-full items-center justify-center">
            <div className="il-animate-glow h-[340px] w-[340px] rounded-full bg-emerald-400/15 blur-[85px] sm:h-[460px] sm:w-[460px]" />
          </div>
        </div>

        {/* Soft ambient halo for light phase */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute h-[320px] w-[320px] rounded-full bg-emerald-700/[0.06] blur-[85px] transition-opacity duration-[650ms] ease-in-out sm:h-[420px] sm:w-[420px] ${
            isLightPhase ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Step 1: Animated Brand Logo */}
          <div className="il-animate-logo">
            <div className="relative flex items-center justify-center">
              <div
                className={`absolute -inset-4 rounded-full blur-xl transition-colors duration-[1200ms] ease-in-out ${
                  isLightPhase ? "bg-emerald-900/[0.04]" : "bg-emerald-300/10"
                }`}
                aria-hidden="true"
              />
              <InterlinkMark
                size={96}
                darkCard={!isLightPhase}
                className={`relative h-20 w-16 transition-[filter] duration-[1200ms] ease-in-out sm:h-24 sm:w-20 md:h-28 md:w-24 ${
                  isLightPhase
                    ? "drop-shadow-[0_6px_18px_rgba(15,23,42,0.14)]"
                    : "drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                }`}
              />
            </div>
          </div>

          {/* Step 2: Animated Brand Name */}
          <div className="il-animate-name mt-6 sm:mt-7">
            <p
              className={`font-display text-2xl font-light transition-colors duration-[600ms] ease-in-out sm:text-3xl md:text-4xl ${
                isLightPhase ? "text-slate-950" : "text-white drop-shadow-sm"
              }`}
            >
              INTERLINK
            </p>
          </div>

          {/* Step 3: Animated Tagline / Motto */}
          <div
            className={`il-animate-tagline mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-light tracking-wide transition-colors duration-[1200ms] ease-in-out sm:mt-8 sm:gap-6 sm:text-sm md:gap-8 md:text-base ${
              isLightPhase ? "text-slate-800" : "text-white/90"
            }`}
          >
            <span>Connection</span>
            <span
              className="h-4 w-px bg-interlink-gold/85 sm:h-5 md:h-6"
              aria-hidden="true"
            />
            <span>Empowerment</span>
            <span
              className="h-4 w-px bg-interlink-gold/85 sm:h-5 md:h-6"
              aria-hidden="true"
            />
            <span>Growth</span>
          </div>

          {/* Step 4: Refined Minimal Progress Track */}
          <div className="mt-10 w-36 sm:mt-12 sm:w-44" aria-hidden="true">
            <div
              className={`h-[2px] w-full overflow-hidden rounded-full transition-colors duration-[1200ms] ease-in-out ${
                isLightPhase ? "bg-slate-900/10" : "bg-white/15"
              }`}
            >
              <div className="il-animate-progress relative h-full rounded-full">
                {/* Green-phase bright fill */}
                <span
                  className={`absolute inset-0 rounded-full bg-gradient-to-r from-interlink-gold via-emerald-200 to-white transition-opacity duration-[1200ms] ease-in-out ${
                    isLightPhase ? "opacity-0" : "opacity-100"
                  }`}
                />
                {/* Light-phase dark contrast fill */}
                <span
                  className={`absolute inset-0 rounded-full bg-gradient-to-r from-interlink-gold via-interlink-forest to-slate-900 transition-opacity duration-[1200ms] ease-in-out ${
                    isLightPhase ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
