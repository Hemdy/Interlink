"use client";

import React, { useState } from "react";
import { ArrowRight, Mail, User } from "lucide-react";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";
import { AuthBackdrop, AuthPillInput } from "./AuthShell";
import { resetClientSessionAndNavigate } from "./SessionSyncGuard";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  role = "mentee",
  label = "Continue with Google",
  onSuccess,
  variant = "default",
  className = "",
}: {
  role?: "mentee" | "mentor";
  label?: string;
  onSuccess?: () => void;
  variant?: "default" | "pill";
  className?: string;
}) {
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleEmail, setGoogleEmail] = useState("");
  const [googleFullName, setGoogleFullName] = useState("");

  async function handleGoogleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please enter your Google account email.");
      return;
    }

    setLoading(true);
    setError(null);

    const parts = googleFullName.trim().split(/\s+/);
    const firstName = parts[0] || googleEmail.split("@")[0] || "User";
    const lastName = parts.slice(1).join(" ") || "";

    try {
      const result = await postJson<{ isNew: boolean; user: { firstName: string } }>(
        "/api/v1/auth/google",
        {
          email: googleEmail.trim().toLowerCase(),
          firstName,
          lastName,
          role,
        },
        "Unable to authenticate with Google.",
      );

      if (!result.ok) {
        setError(result.errorMessage ?? "Google authentication failed.");
        return;
      }

      setModalOpen(false);
      pushToast({
        kind: "success",
        title: result.data?.isNew ? "Account created with Google" : "Signed in with Google",
        description: `Welcome to Interlink, ${result.data?.user.firstName ?? firstName}!`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        resetClientSessionAndNavigate("/dashboard");
      }
    } catch {
      setError("Network error authenticating with Google.");
    } finally {
      setLoading(false);
    }
  }

  // function handleQuickAccount(account: { email: string; name: string }) {
  //   setGoogleEmail(account.email);
  //   setGoogleFullName(account.name);
  // }

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className={`flex w-full items-center justify-between rounded-full border border-interlink-border/90 bg-interlink-surface/90 px-5 py-3.5 text-sm font-medium text-interlink-ink shadow-subtle backdrop-blur-sm transition-all duration-200 hover:border-interlink-forest/70 hover:bg-interlink-surface focus-ring ${className}`}
        >
          <span className="flex flex-1 items-center justify-center gap-3 pl-4">
            <GoogleIcon className="h-[18px] w-[18px] shrink-0" />
            <span>{label}</span>
          </span>
          <span className="flex items-center gap-3 border-l border-interlink-border/70 pl-3.5 text-interlink-muted">
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className={`flex w-full items-center justify-center gap-2.5 rounded-[2px] border border-interlink-border bg-interlink-surface px-4 py-2.5 text-sm font-medium text-interlink-ink shadow-subtle transition-all duration-200 hover:border-interlink-forest hover:bg-interlink-app-bg focus-ring ${className}`}
        >
          <GoogleIcon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sign in with Google"
        maxWidthClass="max-w-[420px]"
        containerClassName="rounded-3xl border border-interlink-border/90 bg-interlink-canvas shadow-modal"
      >
        <div className="relative overflow-hidden bg-interlink-canvas p-6 text-interlink-ink sm:p-7">
          <AuthBackdrop compact />

          <div className="relative z-10">
            <div className="flex items-center gap-3.5 border-b border-interlink-border/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-interlink-border bg-white shadow-subtle dark:bg-slate-900">
                <GoogleIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-interlink-ink">
                  Sign in with <span className="text-interlink-forest">Google</span>
                </h3>
                <p className="text-xs text-interlink-muted">
                  to continue to <span className="font-semibold text-interlink-forest">InterLink</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4">
                <ErrorAlert message={error} />
              </div>
            )}

            <form onSubmit={handleGoogleSubmit} className="mt-5 space-y-3.5">
              <div>
                <label className="mb-1.5 block pl-2 text-xs font-medium text-interlink-muted">
                  Google Email Address
                </label>
                <AuthPillInput
                  icon={Mail}
                  name="googleEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="you@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block pl-2 text-xs font-medium text-interlink-muted">
                  Full Name (as on Google profile)
                </label>
                <AuthPillInput
                  icon={User}
                  name="googleName"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Alex Morgan"
                  value={googleFullName}
                  onChange={(e) => setGoogleFullName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-interlink-border/90 bg-interlink-surface/80 px-4 py-2.5 text-xs font-semibold text-interlink-muted transition-colors hover:border-interlink-forest/40 hover:text-interlink-ink focus-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !googleEmail.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-interlink-forest via-interlink-forest-card to-interlink-forest-deep px-5 py-2.5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(50,93,60,0.28)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
                >
                  <span>{loading ? "Authenticating..." : "Continue to InterLink"}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </>
  );
}
