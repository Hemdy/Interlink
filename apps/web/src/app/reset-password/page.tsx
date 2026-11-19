"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, LogIn, Mail } from "lucide-react";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
import {
  AuthBottomCard,
  AuthPillInput,
  AuthShell,
  AuthSubmitButton,
} from "@/features/auth/ui/AuthShell";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";

function ResetPasswordInner() {
  const router = useRouter();
  const { isStandalone } = useNavigationMode();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [forgotEmail, setForgotEmail] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/sign-in");
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setDevResetUrl(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const json = (await res.json()) as {
        data?: { message: string; devResetUrl?: string };
        error?: { message: string };
      };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to request password reset.");
        return;
      }
      setInfoMessage(
        json.data?.message ??
          "If an account exists for that email address, password reset instructions have been issued.",
      );
      setDevResetUrl(json.data?.devResetUrl ?? null);
    } catch {
      setError("Network error while requesting password reset.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to reset password.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error resetting password.");
    } finally {
      setLoading(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back to previous screen"
      className="inline-flex items-center gap-1.5 rounded-full border border-interlink-border/90 bg-interlink-surface/85 px-3.5 py-1.5 text-xs font-semibold text-interlink-ink shadow-subtle backdrop-blur-sm transition-colors hover:border-interlink-forest hover:text-interlink-forest focus-ring"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Back</span>
    </button>
  );

  const isResetMode = Boolean(token);

  return (
    <AuthShell
      logoHref={isStandalone ? "/sign-in" : "/"}
      topLeftSlot={backButton}
      titleLeading={isResetMode ? "Reset" : "Forgot"}
      titleHighlight={isResetMode ? "Password" : "Password?"}
      subtitle={
        isResetMode
          ? "Choose a strong new password for your Interlink account."
          : "Enter your account email and we will issue a reset link."
      }
    >
      {error && (
        <div className="mt-5">
          <ErrorAlert message={error} />
        </div>
      )}

      {isResetMode ? (
        done ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-interlink-forest/15 text-interlink-forest">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-interlink-ink">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/sign-in"
              className="relative mt-6 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-interlink-forest via-interlink-forest-card to-interlink-forest-deep py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(50,93,60,0.3)] transition-all hover:brightness-110 focus-ring"
            >
              <span>Sign In</span>
              <ArrowRight className="absolute right-5 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetSubmit} className="mt-6 space-y-3.5">
            <AuthPillInput
              icon={Lock}
              showPasswordToggle
              name="password"
              placeholder="New Password"
              aria-label="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <AuthPillInput
              icon={Lock}
              showPasswordToggle
              name="confirmPassword"
              placeholder="Confirm New Password"
              aria-label="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <AuthSubmitButton
              loading={loading}
              label="Update Password"
              loadingLabel="Updating..."
            />
          </form>
        )
      ) : (
        <>
          {infoMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-800/60 bg-emerald-950/40 p-3.5 text-xs leading-relaxed text-emerald-200">
              <p>{infoMessage}</p>
              {devResetUrl && (
                <Link
                  href={devResetUrl}
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-interlink-forest underline"
                >
                  <span>Open password reset page</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleForgotSubmit} className="mt-6 space-y-3.5">
            <AuthPillInput
              icon={Mail}
              name="forgotEmail"
              type="email"
              placeholder="E-mail"
              aria-label="E-mail"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <AuthSubmitButton
              loading={loading}
              label="Send Reset Link"
              loadingLabel="Sending..."
            />
          </form>
        </>
      )}

      {!done && (
        <AuthBottomCard
          icon={LogIn}
          title="Remember your password?"
          description="Return to sign in with your existing credentials"
          ctaLabel="Sign In"
          ctaHref="/sign-in"
        />
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="dark [color-scheme:dark]">
          <div className="flex min-h-screen items-center justify-center bg-interlink-canvas">
            <LoadingSpinner />
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
