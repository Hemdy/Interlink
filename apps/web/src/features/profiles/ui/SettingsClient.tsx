"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@interlink/types";
import { formatDate } from "@interlink/utils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { AvatarUploadCard } from "@/features/profiles/ui/AvatarUploadCard";

export function SettingsClient({
  user,
  blockedUsers,
}: {
  user: SessionUser;
  blockedUsers: Array<{ blockedUserId: string; firstName: string; lastName: string }>;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const { theme, setTheme } = useTheme();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

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
        setError(json.error?.message ?? "Unable to save account settings.");
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
    const res = await fetch(`/api/v1/blocks?blockedUserId=${blockedUserId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      pushToast({ kind: "info", title: "User unblocked" });
      router.refresh();
    }
  }

  async function deactivateAccount() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/users/me", { method: "DELETE" });
      if (res.ok) {
        pushToast({ kind: "info", title: "Your account has been deactivated" });
        router.push("/");
        router.refresh();
      }
    } finally {
      setSaving(false);
      setDeactivateOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-lg font-semibold text-interlink-ink">
          Account Information
        </h2>
        {error && (
          <div className="mt-4">
            <ErrorAlert message={error} />
          </div>
        )}
        <form onSubmit={saveAccount} className="mt-5 space-y-4">
          <AvatarUploadCard
            firstName={user.firstName}
            lastName={user.lastName}
            initialProfileImage={user.profileImage}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Email Address" value={user.email} disabled />
            <Input
              label="Username (optional, for sign-in)"
              placeholder="e.g., ada.mentor"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <Button type="submit" loading={saving}>
            Save Account Details
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              Email Verification
            </h2>
            <p className="mt-1 text-xs text-interlink-muted">
              {user.emailVerifiedAt
                ? `Verified on ${formatDate(user.emailVerifiedAt)}`
                : "Your email address is not yet verified."}
            </p>
          </div>
          {user.emailVerifiedAt ? (
            <Badge tone="success">Verified</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={resendVerification} loading={saving}>
              Send Verification Link
            </Button>
          )}
        </div>
        {devVerifyUrl && (
          <div className="mt-3 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
            <Link href={devVerifyUrl} className="font-semibold text-interlink-forest underline">
              Click here to verify email now &rarr;
            </Link>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              Appearance &amp; Theme
            </h2>
            <p className="mt-1 text-xs text-interlink-muted">
              Choose Light or Dark theme. Your preference is saved across sessions.
            </p>
          </div>
          <div className="inline-flex rounded-[2px] border border-interlink-border bg-interlink-app-bg p-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`rounded-[2px] px-3.5 py-1.5 text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-interlink-forest text-white"
                  : "text-interlink-muted hover:text-interlink-ink"
              }`}
            >
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`rounded-[2px] px-3.5 py-1.5 text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-interlink-forest text-white"
                  : "text-interlink-muted hover:text-interlink-ink"
              }`}
            >
              Dark Mode
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-base font-semibold text-interlink-ink">
          Blocked Users ({blockedUsers.length})
        </h2>
        {blockedUsers.length === 0 ? (
          <p className="mt-2 text-xs text-interlink-muted">You have not blocked any users.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {blockedUsers.map((b) => (
              <li
                key={b.blockedUserId}
                className="flex items-center justify-between rounded-[2px] border border-slate-200 px-3 py-2 text-xs"
              >
                <span>
                  {b.firstName} {b.lastName}
                </span>
                <Button size="sm" variant="outline" onClick={() => unblock(b.blockedUserId)}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="border-red-200">
        <h2 className="font-display text-base font-semibold text-red-700">
          Deactivate Account
        </h2>
        <p className="mt-1 text-xs text-interlink-muted">
          Deactivating your account signs you out immediately and hides your profile from mentor
          discovery.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-4"
          onClick={() => setDeactivateOpen(true)}
        >
          Deactivate My Account
        </Button>
      </Card>

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
