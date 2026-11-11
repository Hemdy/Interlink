"use client";

import React, { useEffect, useRef, useState } from "react";

type RevealDirection = "up" | "left" | "right" | "fade";

export function Reveal({
  children,
  direction = "up",
  delayMs = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: RevealDirection;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        typeof IntersectionObserver === "undefined")
    ) {
      setVisible(true);
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -24px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenClass =
    direction === "left"
      ? "reveal-hidden-left"
      : direction === "right"
        ? "reveal-hidden-right"
        : direction === "fade"
          ? "opacity-0"
          : "reveal-hidden-up";

  return (
    <div
      ref={ref}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`reveal-base ${visible ? "reveal-visible" : hiddenClass} ${className}`}
    >
      {children}
    </div>
  );
}
