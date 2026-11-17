"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  FolderKanban,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
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
import { UserAvatar } from "@/components/ui/UserAvatar";

interface MoreMenuItem {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface MoreMenuSection {
  title: string;
  items: MoreMenuItem[];
}

function getMoreSections(
  user: SessionUser,
  unreadNotifications: number,
): MoreMenuSection[] {
  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  const myMentorshipItems: MoreMenuItem[] = isAdmin
    ? [
        {
          label: "Admin Console",
          description: "Verifications, reports & governance",
          href: "/admin",
          icon: ShieldCheck,
        },
        {
          label: "Sessions",
          description: "Platform scheduled sessions",
          href: "/sessions",
          icon: Calendar,
        },
        {
          label: "Resources",
          description: "Career paths & shared guides",
          href: "/learn",
          icon: BookOpen,
        },
      ]
    : isMentor
      ? [
          {
            label: "Sessions",
            description: "Manage upcoming & past sessions",
            href: "/sessions",
            icon: Calendar,
          },
          {
            label: "Availability",
            description: "Weekly hours & mentorship capacity",
            href: "/profile#availability",
            icon: Clock,
          },
          {
            label: "Resources",
            description: "Guides, articles & learning tracks",
            href: "/learn",
            icon: BookOpen,
          },
        ]
      : [
          {
            label: "Sessions",
            description: "Upcoming 1-on-1 calls & summaries",
            href: "/sessions",
            icon: Calendar,
          },
          {
            label: "Goals & Progress",
            description: "Track milestones & career targets",
            href: "/goals",
            icon: Target,
          },
          {
            label: "Resources",
            description: "Career tracks & curated articles",
            href: "/learn",
            icon: BookOpen,
          },
        ];

  return [
    {
      title: "My Mentorship",
      items: myMentorshipItems,
    },
    {
      title: "Account",
      items: [
        {
          label: "My Profile",
          description: "Bio, experience & public profile",
          href: "/profile",
          icon: UserCircle,
        },
        {
          label: "Settings",
          description: "Email, security & notification alerts",
          href: "/settings",
          icon: Settings,
        },
      ],
    },
    {
      title: "Updates",
      items: [
        {
          label: "Notifications",
          description: "Activity alerts & request updates",
          href: "/notifications",
          icon: Bell,
          badge: unreadNotifications,
        },
      ],
    },
  ];
}

export function PWAContextSubNav({
  user,
  unreadNotifications = 0,
  unreadMessages = 0,
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
    pathname === "/mentorships" ||
    pathname.startsWith("/mentorships/") ||
    pathname === "/requests";
  const isMessagesContext = pathname === "/messages" || pathname === "/notifications";

  if (!isDiscoverContext && !isMentorsContext && !isMessagesContext) {
    return null;
  }

  let tabs: { label: string; href: string; active: boolean; badge?: number; icon: React.ComponentType<{ className?: string }> }[] = [];

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
        active: pathname === "/mentorships" || pathname.startsWith("/mentorships/"),
        icon: FolderKanban,
      },
      {
        label: isMentor ? "Incoming Requests" : "Mentorship Requests",
        href: "/requests",
        active: pathname === "/requests",
        icon: Inbox,
      },
    ];
  } else if (isMessagesContext) {
    tabs = [
      {
        label: "Messages",
        href: "/messages",
        active: pathname === "/messages" || pathname.startsWith("/messages/"),
        badge: unreadMessages,
        icon: MessageSquare,
      },
      {
        label: "Notifications",
        href: "/notifications",
        active: pathname === "/notifications",
        badge: unreadNotifications,
        icon: Bell,
      },
    ];
  }

  if (tabs.length <= 1) return null;

  return (
    <div className={wrapperClassName}>
      <div className="mb-4 flex items-center gap-1.5 rounded-[4px] border border-interlink-border bg-interlink-surface p-1 shadow-subtle">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[2px] px-2.5 py-2 text-xs font-medium transition-colors ${
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
}

export function MobilePWABottomNav({
  user,
  unreadNotifications = 0,
  unreadMessages = 0,
  onSignOut,
}: {
  user: SessionUser;
  unreadNotifications?: number;
  unreadMessages?: number;
  onSignOut: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close More menu on route navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Close More menu on Escape key
  useEffect(() => {
    if (!moreOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  const isHomeActive = pathname === "/dashboard";
  const isDiscoverActive =
    pathname === "/mentors" || pathname.startsWith("/mentors/") || pathname === "/saved";
  const isMentorsActive =
    pathname === "/mentorships" ||
    pathname.startsWith("/mentorships/") ||
    pathname === "/requests";
  const isMessagesActive = pathname === "/messages" || pathname === "/notifications";
  const isMoreRouteActive =
    pathname === "/sessions" ||
    pathname === "/goals" ||
    pathname === "/learn" ||
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/onboarding" ||
    pathname === "/admin";

  const mentorsTabLabel = isAdmin ? "Workspaces" : isMentor ? "Mentees" : "Mentors";

  const primaryTabs = [
    {
      id: "home",
      label: "Home",
      href: "/dashboard",
      icon: Home,
      active: isHomeActive && !moreOpen,
      badge: 0,
    },
    {
      id: "discover",
      label: "Discover",
      href: "/mentors",
      icon: Compass,
      active: isDiscoverActive && !moreOpen,
      badge: 0,
    },
    {
      id: "mentors",
      label: mentorsTabLabel,
      href: "/mentorships",
      icon: Users,
      active: isMentorsActive && !moreOpen,
      badge: 0,
    },
    {
      id: "messages",
      label: "Messages",
      href: "/messages",
      icon: MessageSquare,
      active: isMessagesActive && !moreOpen,
      badge: unreadMessages,
    },
  ];

  const moreSections = getMoreSections(user, unreadNotifications);

  return (
    <>
      {/* Expandable "More" Secondary Navigation Drawer */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[1px] transition-opacity"
          onClick={() => setMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="More navigation options"
        >
          <div
            className="mx-auto w-full max-w-2xl rounded-t-[12px] border-t border-interlink-border bg-interlink-surface text-interlink-ink shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2.5">
              <div className="h-1 w-10 rounded-full bg-interlink-border" />
            </div>

            {/* User Header */}
            <div className="flex items-center justify-between border-b border-interlink-border/80 px-5 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  src={user.profileImage}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-interlink-ink">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs capitalize text-interlink-forest">
                    {user.primaryRole.replace("_", " ")} Workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-[4px] p-1.5 text-interlink-muted transition-colors hover:bg-interlink-app-bg hover:text-interlink-ink"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Organized Secondary Sections */}
            <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
              <div className="space-y-5">
                {moreSections.map((section) => (
                  <div key={section.title}>
                    <p className="mb-2 px-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-interlink-muted">
                      {section.title}
                    </p>
                    <div className="overflow-hidden rounded-[4px] border border-interlink-border bg-interlink-app-bg/40 divide-y divide-interlink-border/70">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const baseHref = item.href.split("#")[0] ?? item.href;
                        const active =
                          pathname === baseHref ||
                          (baseHref !== "/dashboard" && pathname.startsWith(`${baseHref}/`));

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center justify-between px-3.5 py-3 transition-colors ${
                              active
                                ? "bg-interlink-forest/10 text-interlink-forest"
                                : "text-interlink-ink hover:bg-interlink-app-bg"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] ${
                                  active
                                    ? "bg-interlink-forest text-white"
                                    : "border border-interlink-border bg-interlink-surface text-interlink-forest"
                                }`}
                              >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{item.label}</p>
                                {item.description && (
                                  <p className="truncate text-[11px] text-interlink-muted">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-interlink-forest px-1.5 text-[11px] font-bold text-white">
                                  {item.badge > 99 ? "99+" : item.badge}
                                </span>
                              )}
                              <ChevronRight className="h-4 w-4 text-interlink-muted" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Sign Out */}
            <div className="border-t border-interlink-border/80 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void onSignOut();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[4px] border border-red-200 bg-red-50/70 px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (Max 5 Primary Items) */}
      <nav
        aria-label="Primary dashboard navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-interlink-border bg-interlink-surface/95 backdrop-blur-md shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-stretch">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors ${
                  tab.active
                    ? "text-interlink-forest"
                    : "text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                {/* Active top bar indicator */}
                {tab.active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 h-[2.5px] w-8 rounded-b-full bg-interlink-forest"
                  />
                )}

                <span
                  className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                    tab.active ? "bg-interlink-forest/12" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.badge > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold leading-none text-white ring-2 ring-interlink-surface">
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

          {/* 5th Item: More Menu Trigger */}
          <button
            type="button"
            onClick={() => setMoreOpen((prev) => !prev)}
            aria-expanded={moreOpen}
            aria-label="More navigation menu"
            className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1 py-1.5 transition-colors ${
              moreOpen || isMoreRouteActive
                ? "text-interlink-forest"
                : "text-interlink-muted hover:text-interlink-ink"
            }`}
          >
            {(moreOpen || isMoreRouteActive) && (
              <span
                aria-hidden="true"
                className="absolute top-0 h-[2.5px] w-8 rounded-b-full bg-interlink-forest"
              />
            )}

            <span
              className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                moreOpen || isMoreRouteActive ? "bg-interlink-forest/12" : ""
              }`}
            >
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-interlink-forest px-1 text-[10px] font-bold leading-none text-white ring-2 ring-interlink-surface">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </span>

            <span
              className={`max-w-full truncate text-[11px] leading-tight ${
                moreOpen || isMoreRouteActive ? "font-semibold" : "font-medium"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
