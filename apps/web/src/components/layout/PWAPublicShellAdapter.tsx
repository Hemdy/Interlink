"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import type { SessionUser } from "@interlink/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  SessionSyncGuard,
  resetClientSessionAndNavigate,
} from "@/features/auth/ui/SessionSyncGuard";
import {
  useNavigationMode,
  useUnreadMessagesCount,
  useUnreadNotificationsCount,
} from "@/features/pwa/useNavigationMode";
import { MobilePWABottomNav, PWAContextSubNav } from "./MobilePWABottomNav";
import { useTopNavScrollVisibility } from "./useTopNavScrollVisibility";

export function PWAPublicShellAdapter({
  user,
  unreadCount,
  header,
  footer,
  chromeOnly = false,
  children,
}: {
  user: SessionUser | null;
  unreadCount?: number;
  header: React.ReactNode;
  footer: React.ReactNode;
  chromeOnly?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { autoHide: autoHideTopNav, visible: topNavVisible } =
    useTopNavScrollVisibility(pathname);
  const { useBottomNav } = useNavigationMode();
  const showPWAShell = Boolean(user && useBottomNav);
  const unreadMessages = useUnreadMessagesCount(showPWAShell);
  const resolvedUnreadCount = useUnreadNotificationsCount(showPWAShell, unreadCount);

  async function handleSignOut() {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => undefined);
    resetClientSessionAndNavigate("/sign-in");
  }

  if (!showPWAShell || !user) {
    if (chromeOnly) return null;
    return (
      <div className="flex min-h-screen flex-col bg-interlink-canvas text-interlink-ink">
        <SessionSyncGuard expectedUserId={user?.id ?? null} />
        {header}
        <div className="flex-1">{children}</div>
        {footer}
      </div>
    );
  }

  if (chromeOnly) {
    return (
      <>
        <header
          data-top-nav-hidden={autoHideTopNav && !topNavVisible ? "true" : "false"}
          aria-hidden={autoHideTopNav && !topNavVisible ? true : undefined}
          className={`fixed inset-x-0 top-0 z-40 flex h-[72px] items-center justify-between border-b border-interlink-border bg-interlink-surface/95 px-4 shadow-subtle backdrop-blur-sm transition-all duration-300 ease-out sm:px-8 ${
            autoHideTopNav && !topNavVisible
              ? "-translate-y-full opacity-0 pointer-events-none"
              : "translate-y-0 opacity-100 pointer-events-auto"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Link
              href="/profile"
              aria-label={`View ${user.firstName} ${user.lastName}'s profile`}
              className="group shrink-0 rounded-full focus-ring"
            >
              <UserAvatar
                src={user.profileImage}
                firstName={user.firstName}
                lastName={user.lastName}
                size="sm"
                className="rounded-full border-interlink-forest/25 shadow-subtle transition-transform duration-200 group-hover:scale-105"
              />
            </Link>
            <span className="h-5 w-px shrink-0 bg-interlink-border" aria-hidden="true" />
            <Link href="/dashboard" className="focus-ring rounded-[2px]">
              <InterlinkLogo variant="compact" />
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-interlink-border bg-interlink-surface text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {resolvedUnreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold text-white">
                  {resolvedUnreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        <MobilePWABottomNav
          user={user}
          unreadNotifications={resolvedUnreadCount}
          unreadMessages={unreadMessages}
          onSignOut={handleSignOut}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-interlink-app-bg text-interlink-ink">
      <SessionSyncGuard expectedUserId={user.id} />
      <header
        data-top-nav-hidden={autoHideTopNav && !topNavVisible ? "true" : "false"}
        aria-hidden={autoHideTopNav && !topNavVisible ? true : undefined}
        className={`${
          autoHideTopNav
            ? `fixed inset-x-0 top-0 z-30 transition-all duration-300 ease-out ${
                topNavVisible
                  ? "translate-y-0 opacity-100 pointer-events-auto"
                  : "-translate-y-full opacity-0 pointer-events-none"
              }`
            : "sticky top-0 z-20"
        } flex h-[68px] items-center justify-between border-b border-interlink-border bg-interlink-surface/95 px-4 shadow-subtle backdrop-blur-sm sm:px-8`}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Link
            href="/profile"
            aria-label={`View ${user.firstName} ${user.lastName}'s profile`}
            className="group shrink-0 rounded-full focus-ring"
          >
            <UserAvatar
              src={user.profileImage}
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
              className="rounded-full border-interlink-forest/25 shadow-subtle transition-transform duration-200 group-hover:scale-105"
            />
          </Link>
          <span className="h-5 w-px shrink-0 bg-interlink-border" aria-hidden="true" />
          <Link href="/dashboard" className="focus-ring rounded-[2px]">
            <InterlinkLogo variant="compact" />
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/notifications"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-interlink-border bg-interlink-surface text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {resolvedUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold text-white">
                {resolvedUnreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <PWAContextSubNav
          user={user}
          unreadNotifications={resolvedUnreadCount}
          unreadMessages={unreadMessages}
          wrapperClassName="mx-auto max-w-[1360px] px-4 pt-4 sm:px-8"
        />
        {children}
      </div>

      <MobilePWABottomNav
        user={user}
        unreadNotifications={resolvedUnreadCount}
        unreadMessages={unreadMessages}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
