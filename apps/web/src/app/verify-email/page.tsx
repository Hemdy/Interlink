"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, MailCheck, Settings } from "lucide-react";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
import { AuthBottomCard, AuthShell } from "@/features/auth/ui/AuthShell";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";

function VerifyEmailInner() {
  const { isStandalone } = useNavigationMode();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { error?: { message: string } };
        if (!active) return;
        if (!res.ok) {
          setError(json.error?.message ?? "Verification failed.");
          setStatus("error");
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Network error verifying email.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthShell
      logoHref={isStandalone ? "/sign-in" : "/"}
      titleLeading="Email"
      titleHighlight="Verification"
      subtitle="Confirm your email address to activate full Interlink access."
    >
      {status === "verifying" && (
        <div className="mt-8 flex flex-col items-center">
          <LoadingSpinner label="Verifying your email address..." />
        </div>
      )}

      {status === "success" && (
        <div className="mt-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-interlink-forest/15 text-interlink-forest">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-interlink-ink">
            Your email address has been verified successfully.
          </p>
          <Link
            href="/dashboard"
            className="relative mt-6 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-interlink-forest via-interlink-forest-card to-interlink-forest-deep py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(50,93,60,0.3)] transition-all hover:brightness-110 focus-ring"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="absolute right-5 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="mt-6 space-y-5">
          <ErrorAlert message={error ?? "Invalid verification token."} />
          <Link
            href="/dashboard"
            className="relative flex w-full items-center justify-center rounded-full border border-interlink-forest/40 bg-interlink-surface py-3 text-sm font-semibold text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:bg-interlink-forest hover:text-white focus-ring"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="absolute right-5 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {status === "idle" && (
        <div className="mt-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-interlink-forest/20 bg-interlink-forest/10 text-interlink-forest">
            <MailCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-interlink-muted">
            Open the verification link sent to your email, or request a new link from your account settings.
          </p>
          <AuthBottomCard
            icon={Settings}
            title="Need a new link?"
            description="Request another verification email in settings"
            ctaLabel="Settings"
            ctaHref="/settings"
          />
        </div>
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailInner />
    </Suspense>
  );
}
