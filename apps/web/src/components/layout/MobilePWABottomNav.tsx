"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Compass,
  FolderKanban,
  Home,
  Inbox,
  MessageSquare,
  UserCircle,
  Users,
} from "lucide-react";
import type { SessionUser } from "@interlink/types";
import { ADMIN_ROLES } from "@interlink/types";

export const PWAContextSubNav = React.memo(function PWAContextSubNav({
  user,
  wrapperClassName = "",
}: {
  user: SessionUser;
  unreadNotifications?: number;
  unreadMessages?: number;
  wrapperClassName?: string;
}) {
  const pathname = usePathname();
  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  const isDiscoverContext =
    pathname === "/mentors" || pathname.startsWith("/mentors/") || pathname === "/saved";
  const isMentorsContext =
    pathname === "/mentorships" || pathname === "/requests";

  if (!isDiscoverContext && !isMentorsContext) {
    return null;
  }

  let tabs: {
    label: string;
    href: string;
    active: boolean;
    badge?: number;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [];

  if (isDiscoverContext) {
    tabs = [
      {
        label: "Discover Mentors",
        href: "/mentors",
        active: pathname === "/mentors" || pathname.startsWith("/mentors/"),
        icon: Compass,
      },
      ...(isMentor || isAdmin
        ? []
        : [
            {
              label: "Saved Mentors",
              href: "/saved",
              active: pathname === "/saved",
              icon: Bookmark,
            },
          ]),
    ];
  } else if (isMentorsContext) {
    tabs = [
      {
        label: isAdmin ? "Workspaces" : isMentor ? "My Mentees" : "My Mentors",
        href: "/mentorships",
        active: pathname === "/mentorships",
        icon: FolderKanban,
      },
      {
        label: isMentor ? "Incoming Requests" : "Mentorship Requests",
        href: "/requests",
        active: pathname === "/requests",
        icon: Inbox,
      },
    ];
  }

  if (tabs.length <= 1) return null;

  return (
    <div className={wrapperClassName}>
      <div className="mb-4 flex items-center gap-1.5 rounded-full border border-interlink-border bg-interlink-surface p-1 shadow-subtle">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                tab.active
                  ? "bg-interlink-forest text-white shadow-sm"
                  : "text-interlink-muted hover:bg-interlink-app-bg hover:text-interlink-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    tab.active
                      ? "bg-white text-interlink-forest"
                      : "bg-interlink-forest text-white"
                  }`}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
});

export const MobilePWABottomNav = React.memo(function MobilePWABottomNav({
  user,
  unreadNotifications = 0,
  unreadMessages = 0,
}: {
  user: SessionUser;
  unreadNotifications?: number;
  unreadMessages?: number;
  onSignOut?: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  const isHomeActive = pathname === "/dashboard";
  const isDiscoverActive =
    pathname === "/mentors" || pathname.startsWith("/mentors/") || pathname === "/saved";
  const isMentorsActive =
    pathname === "/mentorships" ||
    pathname.startsWith("/mentorships/") ||
    pathname === "/requests";
  const isMessagesActive = pathname === "/messages";
  const isAccountActive =
    pathname === "/profile" ||
    pathname === "/account" ||
    pathname === "/settings" ||
    pathname === "/sessions" ||
    pathname === "/goals" ||
    pathname === "/learn" ||
    pathname === "/notifications" ||
    pathname === "/onboarding" ||
    pathname === "/admin";

  const mentorsTabLabel = isAdmin ? "Workspaces" : isMentor ? "Mentees" : "Mentors";

  const tabs = [
    {
      id: "home",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      active: isHomeActive,
      badge: 0,
    },
    {
      id: "discover",
      label: "Discover",
      href: "/mentors",
      icon: Compass,
      active: isDiscoverActive,
      badge: 0,
    },
    {
      id: "mentors",
      label: mentorsTabLabel,
      href: "/mentorships",
      icon: Users,
      active: isMentorsActive,
      badge: 0,
    },
    {
      id: "messages",
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      active: isMessagesActive,
      badge: unreadMessages,
    },
    {
      id: "profile",
      label: "Profile",
      href: "/profile",
      icon: UserCircle,
      active: isAccountActive,
      badge: unreadNotifications,
    },
  ];

  const isHomeRoute = pathname === "/dashboard";

  return (
    <nav
      aria-label="Primary dashboard navigation"
      className={`fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] backdrop-blur-md transition-colors ${
        isHomeRoute
          ? "bg-[#08150e]/95 shadow-[0_-12px_28px_rgba(0,0,0,0.45)]"
          : "border-t border-interlink-border bg-interlink-surface/95 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      }`}
    >
      <div className="mx-auto grid max-w-2xl grid-cols-5 items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors ${
                isHomeRoute
                  ? tab.active
                    ? "text-emerald-300"
                    : "text-emerald-100/65 hover:text-white"
                  : tab.active
                    ? "text-interlink-forest"
                    : "text-interlink-muted hover:text-interlink-ink"
              }`}
            >
              {tab.active && (
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-[2.5px] w-8 rounded-b-full ${
                    isHomeRoute ? "bg-emerald-400" : "bg-interlink-forest"
                  }`}
                />
              )}

              <span
                className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                  tab.active
                    ? isHomeRoute
                      ? "bg-emerald-400/15"
                      : "bg-interlink-forest/12"
                    : ""
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {tab.badge > 0 && (
                  <span
                    className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold leading-none text-white ${
                      isHomeRoute ? "ring-2 ring-[#08150e]" : "ring-2 ring-interlink-surface"
                    }`}
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </span>

              <span
                className={`max-w-full truncate text-[11px] leading-tight ${
                  tab.active ? "font-semibold" : "font-medium"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
