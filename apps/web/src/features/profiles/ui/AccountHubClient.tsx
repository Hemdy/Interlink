"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_ROLES, type SessionUser } from "@interlink/types";
import { formatDate } from "@interlink/utils";
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  LogOut,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Target,
  UserCircle,
  UserX,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { resetClientSessionAndNavigate } from "@/features/auth/ui/SessionSyncGuard";
import { PushNotificationsManager } from "@/features/notifications/ui/PushNotificationsManager";
import { AvatarUploadCard } from "@/features/profiles/ui/AvatarUploadCard";
import { purgeServiceWorkerAuthCache } from "@/features/pwa/ServiceWorkerRegister";
import { isInstalledPWA, useNavigationMode } from "@/features/pwa/useNavigationMode";

interface AccountLinkItem {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AccountHubClient({
  user,
  blockedUsers,
  unreadNotifications = 0,
}: {
  user: SessionUser;
  blockedUsers: Array<{ blockedUserId: string; firstName: string; lastName: string }>;
  unreadNotifications?: number;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { isStandalone } = useNavigationMode();

  const isAdmin = user.roles.some((r) => ADMIN_ROLES.includes(r));
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  const [accountEditOpen, setAccountEditOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username ?? "");
  const [blockedList, setBlockedList] = useState(blockedUsers);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const mentorshipLinks: AccountLinkItem[] = isAdmin
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
          label: "Learning Resources",
          description: "Career paths & shared guides",
          href: "/learn",
          icon: BookOpen,
        },
        {
          label: "Notifications",
          description: "Activity alerts & updates",
          href: "/notifications",
          icon: Bell,
          badge: unreadNotifications,
        },
      ]
    : isMentor
      ? [
          {
            label: "Sessions",
            description: "Manage upcoming & past calls",
            href: "/sessions",
            icon: Calendar,
          },
          {
            label: "Availability & Capacity",
            description: "Weekly hours & mentee slots",
            href: "/profile#availability",
            icon: Clock,
          },
          {
            label: "Learning Resources",
            description: "Guides, articles & tracks",
            href: "/learn",
            icon: BookOpen,
          },
          {
            label: "Notifications",
            description: "Activity alerts & updates",
            href: "/notifications",
            icon: Bell,
            badge: unreadNotifications,
          },
        ]
      : [
          {
            label: "Sessions",
            description: "Upcoming 1-on-1 calls & notes",
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
            label: "Learning Resources",
            description: "Career tracks & curated guides",
            href: "/learn",
            icon: BookOpen,
          },
          {
            label: "Notifications",
            description: "Activity alerts & updates",
            href: "/notifications",
            icon: Bell,
            badge: unreadNotifications,
          },
        ];

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          username: username.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to save account details.");
        return;
      }
      pushToast({ kind: "success", title: "Account details updated" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend: true }),
      });
      const json = (await res.json()) as { data?: { devVerificationUrl?: string } };
      if (res.ok) {
        pushToast({ kind: "success", title: "Verification link generated" });
        if (json.data?.devVerificationUrl) {
          setDevVerifyUrl(json.data.devVerificationUrl);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function unblock(blockedUserId: string) {
    const previous = blockedList;
    setBlockedList((prev) => prev.filter((b) => b.blockedUserId !== blockedUserId));
    pushToast({ kind: "info", title: "User unblocked" });

    try {
      const res = await fetch(`/api/v1/blocks?blockedUserId=${blockedUserId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setBlockedList(previous);
      pushToast({ kind: "error", title: "Unable to unblock user" });
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => undefined);
    resetClientSessionAndNavigate(isStandalone || isInstalledPWA() ? "/sign-in" : "/");
  }

  async function deactivateAccount() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/users/me", { method: "DELETE" });
      if (res.ok) {
        pushToast({ kind: "info", title: "Your account has been deactivated" });
        if (isInstalledPWA()) {
          purgeServiceWorkerAuthCache();
          router.replace("/sign-in");
          router.refresh();
          return;
        }
        router.push("/");
        router.refresh();
      }
    } finally {
      setSaving(false);
      setDeactivateOpen(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Compact Account Overview Card */}
      <Card elevated className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <UserAvatar
              src={user.profileImage}
              firstName={user.firstName}
              lastName={user.lastName}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-lg font-bold text-interlink-ink">
                  {user.firstName} {user.lastName}
                </h1>
                <Badge tone="forest" className="capitalize">
                  {user.primaryRole.replace("_", " ")}
                </Badge>
              </div>
              <p className="truncate text-xs text-interlink-muted">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/profile"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-interlink-forest px-4 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
            >
              <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />
              My Profile
            </Link>
            {isMentor && (
              <Link
                href={`/mentors/${user.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-interlink-border bg-interlink-surface px-3.5 text-xs font-semibold text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Public View
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Category 1: Mentorship, Learning & Updates */}
      <section aria-labelledby="cat-mentorship">
        <p
          id="cat-mentorship"
          className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-interlink-muted"
        >
          Mentorship &amp; Updates
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {mentorshipLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-2xl border border-interlink-border bg-interlink-surface px-4 py-3 shadow-subtle transition-colors hover:border-interlink-forest/60 hover:bg-interlink-app-bg/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-interlink-forest/10 text-interlink-forest">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-interlink-ink">
                      {item.label}
                    </p>
                    <p className="truncate text-[11px] text-interlink-muted">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-interlink-forest px-1.5 text-[11px] font-bold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-interlink-muted" aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Category 2: Account & Appearance */}
      <section aria-labelledby="cat-account-appearance" className="space-y-3">
        <p
          id="cat-account-appearance"
          className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-interlink-muted"
        >
          Account &amp; Appearance
        </p>

        {/* Compact Theme & Verification Rows */}
        <Card className="divide-y divide-interlink-border/60 p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
              ) : (
                <Sun className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
              )}
              <div>
                <p className="text-sm font-semibold text-interlink-ink">Appearance</p>
                <p className="text-[11px] text-interlink-muted">
                  Switch between light and dark theme
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-full border border-interlink-border bg-interlink-app-bg p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                  theme === "light"
                    ? "bg-interlink-forest text-white"
                    : "text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                  theme === "dark"
                    ? "bg-interlink-forest text-white"
                    : "text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-interlink-ink">Email Verification</p>
              <p className="text-[11px] text-interlink-muted">
                {user.emailVerifiedAt
                  ? `Verified on ${formatDate(user.emailVerifiedAt)}`
                  : "Verify your email to unlock full workspace alerts."}
              </p>
            </div>
            {user.emailVerifiedAt ? (
              <Badge tone="success">Verified</Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={resendVerification} loading={saving}>
                Send Link
              </Button>
            )}
          </div>

          {devVerifyUrl && (
            <div className="bg-emerald-50 px-4 py-2.5 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
              <Link href={devVerifyUrl} className="font-semibold text-interlink-forest underline">
                Click here to verify email now &rarr;
              </Link>
            </div>
          )}

          {/* Collapsible Personal Details & Photo Editor */}
          <div>
            <button
              type="button"
              onClick={() => setAccountEditOpen((prev) => !prev)}
              aria-expanded={accountEditOpen}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-interlink-app-bg/40"
            >
              <div>
                <p className="text-sm font-semibold text-interlink-ink">
                  Personal Information &amp; Photo
                </p>
                <p className="text-[11px] text-interlink-muted">
                  Update your name, sign-in username, and profile photo
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-interlink-muted transition-transform ${
                  accountEditOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {accountEditOpen && (
              <div className="border-t border-interlink-border/60 bg-interlink-app-bg/25 p-4">
                {error && (
                  <div className="mb-3">
                    <ErrorAlert message={error} />
                  </div>
                )}
                <form onSubmit={saveAccount} className="space-y-4">
                  <AvatarUploadCard
                    firstName={user.firstName}
                    lastName={user.lastName}
                    initialProfileImage={user.profileImage}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                    <Input
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Email Address" value={user.email} disabled />
                    <Input
                      label="Username (optional)"
                      placeholder="e.g., ada.mentor"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="sm" loading={saving}>
                    Save Account Details
                  </Button>
                </form>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Category 3: Push Notifications & Preferences */}
      <section aria-labelledby="cat-notifications">
        <p
          id="cat-notifications"
          className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-interlink-muted"
        >
          Notifications &amp; Devices
        </p>
        <PushNotificationsManager compact />
      </section>

      {/* Category 4: Privacy, Security & Session */}
      <section aria-labelledby="cat-privacy-session" className="space-y-3">
        <p
          id="cat-privacy-session"
          className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-interlink-muted"
        >
          Privacy &amp; Session
        </p>

        <Card className="divide-y divide-interlink-border/60 overflow-hidden p-0">
          <div>
            <button
              type="button"
              onClick={() => setBlockedOpen((prev) => !prev)}
              aria-expanded={blockedOpen}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-interlink-app-bg/40"
            >
              <div className="flex items-center gap-2.5">
                <UserX className="h-4 w-4 text-interlink-muted" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-interlink-ink">
                    Blocked Users ({blockedList.length})
                  </p>
                  <p className="text-[11px] text-interlink-muted">
                    Manage members you have blocked
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-interlink-muted transition-transform ${
                  blockedOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {blockedOpen && (
              <div className="border-t border-interlink-border/60 bg-interlink-app-bg/25 p-4">
                {blockedList.length === 0 ? (
                  <p className="text-xs text-interlink-muted">
                    You have not blocked any users.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {blockedList.map((b) => (
                      <li
                        key={b.blockedUserId}
                        className="flex items-center justify-between rounded-xl border border-interlink-border bg-interlink-surface px-3.5 py-2 text-xs"
                      >
                        <span className="font-medium text-interlink-ink">
                          {b.firstName} {b.lastName}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unblock(b.blockedUserId)}
                        >
                          Unblock
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 text-red-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Deactivate Account
                </p>
                <p className="text-[11px] text-interlink-muted">
                  Signs you out and hides your profile from discovery
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          </div>
        </Card>

        <Button
          type="button"
          variant="outline"
          onClick={handleSignOut}
          loading={signingOut}
          className="w-full rounded-2xl border-red-200 bg-red-50/70 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign Out
        </Button>
      </section>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={deactivateAccount}
        title="Deactivate your Interlink account?"
        description="Your profile will no longer be visible and all active sessions will be signed out."
        confirmLabel="Deactivate Account"
        destructive
        loading={saving}
      />
    </div>
  );
}
