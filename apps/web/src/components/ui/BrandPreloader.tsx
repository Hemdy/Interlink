"use client";

import React, { useEffect, useState } from "react";
import { InterlinkMark } from "./InterlinkLogo";

export function BrandPreloader() {
  const [mounted, setMounted] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Prevent background scrolling while preloader is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Begin graceful fade-out transition at 5.0 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      document.body.style.overflow = originalOverflow;
    }, 5000);

    // Completely unmount overlay from DOM at 5.7 seconds
    const unmountTimer = setTimeout(() => {
      setMounted(false);
    }, 5700);

    // Allow user to press Escape to dismiss early
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExiting(true);
        document.body.style.overflow = originalOverflow;
        setTimeout(() => setMounted(false), 500);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!mounted) {
    return null;
  }

  // const handleSkip = () => {
  //   setIsExiting(true);
  //   document.body.style.overflow = "";
  //   setTimeout(() => setMounted(false), 450);
  // };

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
          animation: il-preloader-logo 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-name {
          animation: il-preloader-name 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-tagline {
          animation: il-preloader-tagline 5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .il-animate-progress {
          animation: il-preloader-progress 4.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .il-animate-glow {
          animation: il-preloader-glow 4s ease-in-out infinite;
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
            ? "opacity-0 pointer-events-none scale-[1.015]"
            : "opacity-100 pointer-events-auto scale-100"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, #285438 0%, #1c3c28 55%, #102318 100%)",
        }}
      >
        <span className="sr-only">
          Interlink — Connection, Empowerment, Growth. Loading platform...
        </span>

        {/* Ambient subtle emerald glow */}
        <div
          className="il-animate-glow pointer-events-none absolute h-[340px] w-[340px] rounded-full bg-emerald-400/15 blur-[85px] sm:h-[460px] sm:w-[460px]"
          aria-hidden="true"
        />

        {/* Skip button for user control & accessibility */}
        {/* <button
          type="button"
          onClick={handleSkip}
          className="absolute right-5 top-5 rounded-[2px] border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-light text-white/70 backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 hover:text-white focus-ring"
          aria-label="Skip introduction"
        >
          Skip &rarr;
        </button> */}

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Step 1: Animated Brand Logo */}
          <div className="il-animate-logo">
            <div className="relative flex items-center justify-center">
              <div
                className="absolute -inset-4 rounded-full bg-emerald-300/10 blur-xl"
                aria-hidden="true"
              />
              <InterlinkMark
                size={96}
                darkCard
                className="relative h-20 w-16 drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:h-24 sm:w-20 md:h-28 md:w-24"
              />
            </div>
          </div>

          {/* Step 2: Animated Brand Name */}
          <div className="il-animate-name mt-6 sm:mt-7">
            <h1 className="font-display text-2xl font-light text-white drop-shadow-sm sm:text-3xl md:text-4xl">
              INTERLINK
            </h1>
          </div>

          {/* Step 3: Animated Tagline / Motto */}
          <div className="il-animate-tagline mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-light tracking-wide text-white/90 sm:mt-8 sm:gap-6 sm:text-sm md:gap-8 md:text-base">
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
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/15">
              <div className="il-animate-progress h-full rounded-full bg-gradient-to-r from-interlink-gold via-emerald-200 to-white" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
