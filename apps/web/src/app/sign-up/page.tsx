"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, LogIn, Mail, User } from "lucide-react";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
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
import { resetClientSessionAndNavigate } from "@/features/auth/ui/SessionSyncGuard";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";

function SignUpInner() {
  const { isStandalone } = useNavigationMode();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const initialRole = searchParams.get("role") === "mentor" ? "mentor" : "mentee";

  const [role, setRole] = useState<"mentee" | "mentor">(initialRole);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
          window.location.replace("/dashboard");
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [isStandalone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await postJson(
        "/api/v1/auth/register",
        {
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          role,
          acceptPolicies: true,
        },
        "Unable to register.",
      );
      if (!result.ok) {
        setError(result.errorMessage ?? "Unable to register.");
        return;
      }
      pushToast({
        kind: "success",
        title: "Account created!",
        description:
          "Welcome to Interlink! You can finish setting up your profile anytime from your dashboard.",
      });
      resetClientSessionAndNavigate("/dashboard");
    } catch {
      setError("Network error creating account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      logoHref={isStandalone ? "/sign-in" : "/"}
      titleLeading="Create"
      titleHighlight="Account"
      subtitle="Start your mentorship journey as a mentee or mentor."
      maxWidthClass="max-w-[460px]"
    >
      {/* Role Selector Pill */}
      <div className="mt-6 grid grid-cols-2 gap-1.5 rounded-full border border-interlink-border/90 bg-interlink-surface/85 p-1 shadow-subtle backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setRole("mentee")}
          className={`rounded-full py-2 text-xs font-semibold transition-all ${
            role === "mentee"
              ? "bg-gradient-to-r from-interlink-forest to-interlink-forest-deep text-white shadow-sm"
              : "text-interlink-muted hover:text-interlink-ink"
          }`}
        >
          Join as Mentee
        </button>
        <button
          type="button"
          onClick={() => setRole("mentor")}
          className={`rounded-full py-2 text-xs font-semibold transition-all ${
            role === "mentor"
              ? "bg-gradient-to-r from-interlink-forest to-interlink-forest-deep text-white shadow-sm"
              : "text-interlink-muted hover:text-interlink-ink"
          }`}
        >
          Join as Mentor
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert message={error} />
        </div>
      )}

      <div className="mt-4">
        <GoogleAuthButton
          variant="pill"
          role={role}
          label={`Sign up as ${role === "mentor" ? "Mentor" : "Mentee"} with Google`}
          onSuccess={() => {
            resetClientSessionAndNavigate("/dashboard");
          }}
        />
      </div>

      <AuthDivider label="or register with email" />

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AuthPillInput
            icon={User}
            name="firstName"
            placeholder="First Name"
            aria-label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <AuthPillInput
            icon={User}
            name="lastName"
            placeholder="Last Name"
            aria-label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            autoComplete="family-name"
          />
        </div>

        <AuthPillInput
          icon={Mail}
          name="email"
          type="email"
          placeholder="E-mail"
          aria-label="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <AuthPillInput
          icon={Lock}
          showPasswordToggle
          name="password"
          placeholder="Create Password"
          aria-label="Create Password"
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
          placeholder="Confirm Password"
          aria-label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />

        <AuthSubmitButton loading={loading} label="Sign Up" loadingLabel="Creating account..." />
      </form>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-interlink-muted">
        By clicking Sign Up, you agree to our{" "}
        <Link href="/legal/terms" className="font-medium text-interlink-forest hover:underline">
          Terms and Condition
        </Link>
        . Learn how we process your data in our{" "}
        <Link href="/legal/privacy" className="font-medium text-interlink-forest hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/legal/cookies" className="font-medium text-interlink-forest hover:underline">
          Cookie Policy
        </Link>
        .
      </p>

      <AuthBottomCard
        icon={LogIn}
        title="Already have an account?"
        description="Sign in to access your mentorship workspace"
        ctaLabel="Sign In"
        ctaHref="/sign-in"
      />
    </AuthShell>
  );
}

export default function SignUpPage() {
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
      <SignUpInner />
    </Suspense>
  );
}
