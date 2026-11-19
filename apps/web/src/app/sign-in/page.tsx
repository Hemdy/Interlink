"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { ErrorAlert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";
import {
  AuthPillInput,
  AuthShell,
  AuthSubmitButton,
} from "@/features/auth/ui/AuthShell";
import { resetClientSessionAndNavigate } from "@/features/auth/ui/SessionSyncGuard";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";

function SignInContent() {
  const { isStandalone } = useNavigationMode();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const redirectTarget =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  const { pushToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStandalone) return;
    const controller = new AbortController();
    fetch("/api/v1/auth/me", {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((res) => {
        if (res.ok) {
          window.location.replace(redirectTarget);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isStandalone, redirectTarget]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await postJson(
        "/api/v1/auth/login",
        { identifier, password },
        "Unable to sign in.",
      );
      if (!result.ok) {
        setError(result.errorMessage ?? "Unable to sign in.");
        return;
      }
      pushToast({ kind: "success", title: "Signed in to Interlink" });
      resetClientSessionAndNavigate(redirectTarget);
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      logoHref={isStandalone ? "/sign-in" : "/"}
      titleLeading="Welcome"
      titleHighlight="Back"
      subtitle="Sign in to continue your mentorship journey."
    >
      {/* Form Group with 8rem top spacing & smooth entrance animations */}
      <div className="mt-32 animate-auth-group">
        {error && (
          <div className="mb-5">
            <ErrorAlert message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-auth-group-delay-1">
            <AuthPillInput
              icon={Mail}
              name="identifier"
              type="text"
              placeholder="E-mail or Username"
              aria-label="E-mail or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="animate-auth-group-delay-1">
            <AuthPillInput
              icon={Lock}
              showPasswordToggle
              name="password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="mt-2.5 flex justify-end pr-2">
              <Link
                href="/reset-password"
                className="text-xs font-semibold text-interlink-forest transition-colors hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          <div className="animate-auth-group-delay-2 pt-2">
            <AuthSubmitButton loading={loading} label="Login" loadingLabel="Signing in..." />
          </div>
        </form>

        <p className="animate-auth-group-delay-2 mt-7 text-center text-xs text-interlink-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-interlink-forest transition-colors hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="dark [color-scheme:dark]">
          <div className="flex min-h-screen items-center justify-center bg-interlink-canvas">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-interlink-forest border-t-transparent" />
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
