"use client";

import { useEffect, useState } from "react";

/**
 * Routes where the top navigation starts hidden at the top of the page
 * and slides/fades smoothly into a fixed header once the user scrolls.
 */
export function isAutoHideTopNavRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === "/dashboard" ||
    pathname === "/profile" ||
    pathname === "/mentors" ||
    pathname.startsWith("/mentors/")
  );
}

/**
 * Returns `autoHide` (whether the current route hides its top bar at y=0)
 * and `visible` (always true on normal routes; true once scrollY > 16 on autoHide routes).
 */
export function useTopNavScrollVisibility(pathname: string | null | undefined) {
  const autoHide = isAutoHideTopNavRoute(pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!autoHide) {
      setScrolled(false);
      return;
    }

    const update = () => {
      setScrolled(window.scrollY > 16);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [autoHide, pathname]);

  return {
    autoHide,
    visible: autoHide ? scrolled : true,
  };
}
