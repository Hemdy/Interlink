"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Users } from "lucide-react";
import { ErrorAlert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";
import {
  AuthBottomCard,
  AuthDivider,
  AuthPillInput,
  AuthShell,
  AuthSubmitButton,
} from "@/features/auth/ui/AuthShell";
import { GoogleAuthButton } from "@/features/auth/ui/GoogleAuthButton";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";

function SignInContent() {
  const router = useRouter();
  const { isStandalone } = useNavigationMode();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const redirectTarget = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const { pushToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStandalone) return;
    const controller = new AbortController();
    fetch("/api/v1/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (res.ok) {
          router.replace(redirectTarget);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isStandalone, redirectTarget, router]);

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
      router.replace(redirectTarget);
      router.refresh();
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
      titleHighlight="Back!"
      subtitle="Sign in to continue your journey with Interlink."
    >
      {error && (
        <div className="mt-5">
          <ErrorAlert message={error} />
        </div>
      )}

      <div className="mt-6">
        <GoogleAuthButton
          variant="pill"
          label="Continue with Google"
          onSuccess={() => {
            router.replace(redirectTarget);
            router.refresh();
          }}
        />
      </div>

      <AuthDivider label="or continue with email" />

      <form onSubmit={handleSubmit} className="space-y-3.5">
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

        <AuthSubmitButton loading={loading} label="Login" loadingLabel="Signing in..." />
      </form>

      <div className="mt-5 text-center">
        <Link
          href="/reset-password"
          className="text-xs font-semibold text-interlink-forest hover:underline"
        >
          Forgot Password?
        </Link>

        <div className="mx-auto my-3.5 h-px w-48 bg-gradient-to-r from-transparent via-interlink-border to-transparent" />

        <p className="text-xs text-interlink-muted">
          View{" "}
          <Link href="/legal/terms" className="font-medium text-interlink-forest hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/legal/terms" className="font-medium text-interlink-forest hover:underline">
            Condition
          </Link>
        </p>
      </div>

      <AuthBottomCard
        icon={Users}
        title="New here?"
        description="Sign Up and get linked with mentors world wide"
        ctaLabel="Sign Up"
        ctaHref="/sign-up"
      />
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-interlink-canvas">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-interlink-forest border-t-transparent" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
