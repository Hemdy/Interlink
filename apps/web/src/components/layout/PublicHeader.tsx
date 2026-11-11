"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, Settings, UserCircle, X } from "lucide-react";
import type { SessionUser } from "@interlink/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { useAuthModal } from "@/features/auth/ui/AuthModalProvider";

const primaryNavLinks = [
  { label: "Browse Mentors", href: "/mentors" },
  { label: "Become a Mentor", href: "/become-a-mentor" },
  { label: "Learn", href: "/learn" },
  { label: "Membership", href: "/membership" },
  { label: "About Us", href: "/about" },
];

export function PublicHeader({ user }: { user: SessionUser | null }) {
  const { openSignIn, openSignUp } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-interlink-border bg-interlink-surface/95 shadow-subtle backdrop-blur-sm">
      <div className="mx-auto grid h-[72px] max-w-[1360px] grid-cols-2 items-center px-4 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        {/* Far Left: Interlink Logo */}
        <div className="flex items-center justify-self-start">
          <Link href="/" className="focus-ring rounded-[2px]">
            <InterlinkLogo />
          </Link>
        </div>

        {/* Center: Horizontally Centred Primary Navigation Links */}
        <nav
          className="hidden items-center justify-center gap-6 lg:flex xl:gap-8"
          aria-label="Primary navigation"
        >
          {primaryNavLinks.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap py-1 text-sm font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:bg-interlink-forest after:transition-all after:duration-200 ${
                  isActive
                    ? "text-interlink-forest after:w-full"
                    : "text-interlink-ink hover:text-interlink-forest after:w-0 hover:after:w-full"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Far Right: Theme Toggle + Separated Sign In / Sign Up (or User Account Menu) */}
        <div className="hidden items-center justify-self-end gap-3 lg:flex">
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-2.5 border-l border-interlink-border pl-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-[2px] bg-interlink-forest px-4 py-1.5 text-sm font-medium text-white shadow-subtle transition-all duration-200 hover:bg-interlink-forest-hover focus-ring"
              >
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                Dashboard
              </Link>
              <DropdownMenu
                triggerLabel={user.firstName}
                triggerSublabel={user.primaryRole.replace("_", " ")}
                items={[
                  {
                    label: "My Profile",
                    href: "/profile",
                    icon: <UserCircle className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Account Settings",
                    href: "/settings",
                    icon: <Settings className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "Sign Out",
                    onClick: () => void handleLogout(),
                    destructive: true,
                    icon: <LogOut className="h-3.5 w-3.5" />,
                  },
                ]}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 border-l border-interlink-border pl-3">
              <button
                type="button"
                onClick={openSignIn}
                className="rounded-[2px] px-3 py-1.5 text-sm font-medium text-interlink-ink transition-colors hover:bg-interlink-app-bg hover:text-interlink-forest focus-ring"
              >
                Sign In
              </button>
              <Button
                size="md"
                onClick={() => openSignUp("mentee")}
                className="px-5 py-1.5 font-semibold"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>

        {/* Mobile / Tablet right controls */}
        <div className="flex items-center justify-self-end gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-[2px] border border-interlink-border bg-interlink-surface p-2 text-interlink-ink hover:border-interlink-forest lg:hidden focus-ring"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet drawer */}
      {mobileOpen && (
        <div className="border-t border-interlink-border bg-interlink-surface px-4 py-5 shadow-elevated lg:hidden">
          <nav className="flex flex-col space-y-1" aria-label="Mobile navigation">
            {primaryNavLinks.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-[2px] px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-interlink-forest/10 text-interlink-forest"
                      : "text-interlink-ink hover:bg-interlink-app-bg"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-3 border-t border-interlink-border pt-4">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[2px] bg-interlink-forest px-4 py-2 text-center text-sm font-medium text-white"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      void handleLogout();
                    }}
                    className="py-1.5 text-center text-xs text-interlink-muted hover:text-interlink-ink"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileOpen(false);
                      openSignIn();
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileOpen(false);
                      openSignUp("mentee");
                    }}
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
