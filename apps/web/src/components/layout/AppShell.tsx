"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BookOpen,
  Calendar,
  Compass,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  Target,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import type { SessionUser } from "@interlink/types";
import { ADMIN_ROLES } from "@interlink/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  SessionSyncGuard,
  resetClientSessionAndNavigate,
} from "@/features/auth/ui/SessionSyncGuard";
import { PWAInstallPrompt } from "@/features/pwa/PWAInstallPrompt";
import { ServiceWorkerRegister } from "@/features/pwa/ServiceWorkerRegister";
import {
  isInstalledPWA,
  useNavigationMode,
  useUnreadMessagesCount,
  useUnreadNotificationsCount,
} from "@/features/pwa/useNavigationMode";
import {
  MobilePWABottomNav,
  PWAContextSubNav,
} from "@/components/layout/MobilePWABottomNav";
import { WorkspaceHeaderProvider } from "@/components/layout/WorkspaceHeaderContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getNavItemsForUser(user: SessionUser): NavItem[] {
  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  if (isAdmin) {
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Admin Console", href: "/admin", icon: ShieldCheck },
      { label: "Discover Mentors", href: "/mentors", icon: Compass },
      { label: "Workspaces", href: "/mentorships", icon: FolderKanban },
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Resources", href: "/learn", icon: BookOpen },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "My Profile", href: "/profile", icon: UserCircle },
    ];
  }

  if (isMentor) {
    return [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Incoming Requests", href: "/requests", icon: Inbox },
      { label: "My Mentees", href: "/mentorships", icon: Users },
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Sessions", href: "/sessions", icon: Calendar },
      { label: "Availability", href: "/profile#availability", icon: Calendar },
      { label: "Resources", href: "/learn", icon: BookOpen },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "My Profile", href: "/profile", icon: UserCircle },
    ];
  }

  return [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Discover Mentors", href: "/mentors", icon: Compass },
    { label: "My Mentors", href: "/mentorships", icon: FolderKanban },
    { label: "Mentorship Requests", href: "/requests", icon: Inbox },
    { label: "Messages", href: "/messages", icon: MessageSquare },
    { label: "Sessions", href: "/sessions", icon: Calendar },
    { label: "Goals & Progress", href: "/goals", icon: Target },
    { label: "Saved Mentors", href: "/saved", icon: Bookmark },
    { label: "Resources", href: "/learn", icon: BookOpen },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "My Profile", href: "/profile", icon: UserCircle },
  ];
}

export function AppShell({
  user,
  unreadCount = 0,
  // title,
  // subtitle,
  actions,
  children,
}: {
  user: SessionUser;
  unreadCount?: number;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerActions, setHeaderActions] = useState<React.ReactNode | null>(null);
  const { isStandalone, useBottomNav } = useNavigationMode();
  const unreadMessages = useUnreadMessagesCount(useBottomNav);
  const liveUnreadCount = useUnreadNotificationsCount(true, unreadCount);

  const isMessagesRoute = pathname === "/messages";
  const isHomeFeedRoute = pathname === "/dashboard";

  const navItems = useMemo(() => getNavItemsForUser(user), [user]);

  const handleSignOut = useCallback(async () => {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => undefined);
    resetClientSessionAndNavigate(isStandalone || isInstalledPWA() ? "/sign-in" : "/");
  }, [isStandalone]);

  const SidebarContent = (
    <div
      className={`flex h-full flex-col justify-between ${
        isHomeFeedRoute
          ? "bg-[#0c2016] text-[#edf6f1]"
          : "bg-interlink-surface text-interlink-ink"
      }`}
    >
      <div>
        <div
          className={`flex h-[68px] items-center justify-between px-5 ${
            isHomeFeedRoute ? "" : "border-b border-interlink-border"
          }`}
        >
          <Link href={isStandalone ? "/dashboard" : "/"} className="focus-ring rounded-[2px]">
            <InterlinkLogo variant="compact" inverted={isHomeFeedRoute} />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className={`rounded-[2px] p-1 lg:hidden ${
              isHomeFeedRoute
                ? "text-emerald-200 hover:bg-white/10"
                : "text-interlink-muted hover:bg-interlink-app-bg"
            }`}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`flex items-center gap-3 px-5 py-3.5 ${
            isHomeFeedRoute ? "bg-white/[0.03]" : "border-b border-interlink-border/60"
          }`}
        >
          <UserAvatar
            src={user.profileImage}
            firstName={user.firstName}
            lastName={user.lastName}
            size="sm"
          />
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold ${
                isHomeFeedRoute ? "text-white" : "text-interlink-ink"
              }`}
            >
              {user.firstName} {user.lastName}
            </p>
            <p
              className={`mt-0.5 text-xs capitalize ${
                isHomeFeedRoute ? "text-emerald-300" : "text-interlink-forest"
              }`}
            >
              {user.primaryRole.replace("_", " ")}
            </p>
          </div>
        </div>

        <nav className="space-y-0.5 p-3" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const baseHref = item.href.split("#")[0] ?? item.href;
            const active =
              pathname === baseHref ||
              (baseHref !== "/dashboard" && pathname.startsWith(`${baseHref}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-interlink-forest font-semibold text-white shadow-subtle"
                    : isHomeFeedRoute
                      ? "text-emerald-100/80 hover:bg-white/10 hover:text-white"
                      : "text-interlink-ink/85 hover:bg-interlink-app-bg hover:text-interlink-ink"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.href === "/notifications" && liveUnreadCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active
                        ? "bg-white text-interlink-forest"
                        : "bg-interlink-forest text-white"
                    }`}
                  >
                    {liveUnreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`p-3 ${isHomeFeedRoute ? "" : "border-t border-interlink-border"}`}>
        <button
          type="button"
          onClick={handleSignOut}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
            isHomeFeedRoute
              ? "text-emerald-200/75 hover:bg-red-500/20 hover:text-red-200"
              : "text-interlink-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          }`}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-screen transition-colors ${
        isHomeFeedRoute
          ? "bg-[#0a1a12] text-[#edf6f1]"
          : "bg-interlink-app-bg text-interlink-ink"
      }`}
    >
      {/* Desktop fixed sidebar (hidden when PWA bottom nav mode is active) */}
      {!useBottomNav && (
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden w-64 lg:block ${
            isHomeFeedRoute
              ? "bg-[#0c2016]"
              : "border-r border-interlink-border bg-interlink-surface"
          }`}
        >
          {SidebarContent}
        </aside>
      )}

      {/* Mobile/Tablet browser slide-over sidebar (hidden when PWA bottom nav mode is active) */}
      {!useBottomNav && sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className={`h-full w-72 shadow-xl ${
              isHomeFeedRoute
                ? "bg-[#0c2016]"
                : "border-r border-interlink-border bg-interlink-surface"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div
        className={`flex flex-col ${
          isMessagesRoute && useBottomNav
            ? "h-[100dvh] overflow-hidden"
            : "min-h-[100dvh]"
        } ${useBottomNav ? "" : "lg:pl-64"}`}
      >
        <header
          className={`sticky top-0 z-20 flex h-[68px] shrink-0 items-center justify-between px-4 backdrop-blur-md sm:px-8 ${
            isHomeFeedRoute
              ? "bg-[#0a1a12]/90"
              : "border-b border-interlink-border bg-interlink-surface/95 shadow-subtle"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {useBottomNav ? (
              <Link
                href="/profile"
                aria-label={`View ${user.firstName} ${user.lastName}'s profile`}
                className="group flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-2 transition-colors focus-ring"
              >
                <UserAvatar
                  src={user.profileImage}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="sm"
                  className="rounded-full shadow-subtle transition-transform duration-200 group-hover:scale-105"
                />
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold leading-tight ${
                      isHomeFeedRoute ? "text-white" : "text-interlink-ink"
                    }`}
                  >
                    {user.firstName} {user.lastName}
                  </p>
                  <p
                    className={`truncate text-[11px] capitalize leading-tight ${
                      isHomeFeedRoute ? "text-emerald-300" : "text-interlink-forest"
                    }`}
                  >
                    {user.primaryRole.replace("_", " ")}
                  </p>
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className={`rounded-full p-2 lg:hidden ${
                  isHomeFeedRoute
                    ? "text-emerald-100 hover:bg-white/10"
                    : "text-interlink-muted hover:bg-interlink-app-bg"
                }`}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {actions ?? headerActions}
            <ThemeToggle />
            <Link
              href="/notifications"
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full shadow-subtle transition-colors ${
                isHomeFeedRoute
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "border border-interlink-border bg-interlink-surface text-interlink-ink hover:border-interlink-forest hover:text-interlink-forest"
              }`}
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {liveUnreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold text-white">
                  {liveUnreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {!user.onboardingCompleted && (
          <div
            className={`shrink-0 px-4 py-2.5 text-xs sm:px-8 ${
              isHomeFeedRoute
                ? "bg-[#152f21] text-amber-200"
                : "border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Your profile setup is incomplete. Complete your profile details so{" "}
                {user.primaryRole === "mentor"
                  ? "mentees can discover and request mentorship."
                  : "we can recommend compatible verified mentors."}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className={`font-semibold hover:underline ${
                    isHomeFeedRoute ? "text-emerald-300" : "text-interlink-forest"
                  }`}
                >
                  Edit Profile &rarr;
                </Link>
                <span className="text-amber-400 dark:text-amber-600">·</span>
                <Link
                  href="/onboarding"
                  className={`font-semibold hover:underline ${
                    isHomeFeedRoute ? "text-emerald-300" : "text-interlink-forest"
                  }`}
                >
                  Setup Wizard &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        <main
          className={`mx-auto w-full max-w-7xl ${
            isMessagesRoute
              ? `flex min-h-0 flex-1 flex-col p-0 sm:px-8 sm:py-8 ${
                  useBottomNav
                    ? "pb-[calc(59px+env(safe-area-inset-bottom))] sm:pb-[calc(59px+env(safe-area-inset-bottom))] lg:pb-8"
                    : ""
                }`
              : `px-4 py-6 sm:px-8 sm:py-8 ${
                  useBottomNav ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))]" : ""
                }`
          }`}
        >
          <ServiceWorkerRegister />
          <SessionSyncGuard expectedUserId={user.id} redirectOnUnauthenticated />
          <PWAInstallPrompt />
          {useBottomNav && (
            <PWAContextSubNav
              user={user}
              unreadNotifications={liveUnreadCount}
              unreadMessages={unreadMessages}
            />
          )}
          <WorkspaceHeaderProvider setHeaderActions={setHeaderActions}>
            {children}
          </WorkspaceHeaderProvider>
        </main>
      </div>

      {/* Fixed Bottom Navigation for Mobile/Tablet/Compact Installed PWA */}
      {useBottomNav && (
        <MobilePWABottomNav
          user={user}
          unreadNotifications={liveUnreadCount}
          unreadMessages={unreadMessages}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
