"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Settings,
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
      { label: "Settings", href: "/settings", icon: Settings },
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
      { label: "Settings", href: "/settings", icon: Settings },
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
    { label: "Settings", href: "/settings", icon: Settings },
  ];
}

export function AppShell({
  user,
  unreadCount = 0,
  title,
  subtitle,
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
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = getNavItemsForUser(user);

  async function handleSignOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const SidebarContent = (
    <div className="flex h-full flex-col justify-between bg-interlink-surface text-interlink-ink">
      <div>
        <div className="flex h-[68px] items-center justify-between border-b border-interlink-border px-5">
          <Link href="/" className="focus-ring rounded-[2px]">
            <InterlinkLogo variant="compact" />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-[2px] p-1 text-interlink-muted hover:bg-interlink-app-bg lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-interlink-border/60 px-5 py-3.5">
          <p className="truncate text-sm font-semibold text-interlink-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-0.5 text-xs capitalize text-interlink-forest">
            {user.primaryRole.replace("_", " ")}
          </p>
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
                className={`flex items-center justify-between rounded-[2px] px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-interlink-forest font-medium text-white shadow-subtle"
                    : "text-interlink-ink/85 hover:bg-interlink-app-bg hover:text-interlink-ink"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active
                        ? "bg-white text-interlink-forest"
                        : "bg-interlink-forest text-white"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-interlink-border p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-[2px] px-3 py-2 text-sm text-interlink-muted transition-colors hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-interlink-app-bg text-interlink-ink">
      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-interlink-border bg-interlink-surface lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile slide-over sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="h-full w-72 border-r border-interlink-border bg-interlink-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-interlink-border bg-interlink-surface/95 px-4 shadow-subtle backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-[2px] p-1.5 text-interlink-muted hover:bg-interlink-app-bg lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display text-lg font-semibold text-interlink-ink sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden text-xs text-interlink-muted sm:block">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {actions}
            <ThemeToggle />
            <Link
              href="/notifications"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-[2px] border border-interlink-border bg-interlink-surface text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {!user.onboardingCompleted && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Your onboarding profile is incomplete. Finish onboarding so{" "}
                {user.primaryRole === "mentor"
                  ? "mentees can discover your profile."
                  : "we can recommend compatible mentors."}
              </span>
              <Link
                href="/onboarding"
                className="font-semibold text-interlink-forest underline hover:no-underline"
              >
                Continue Onboarding &rarr;
              </Link>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
