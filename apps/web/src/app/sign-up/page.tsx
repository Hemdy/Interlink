"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, User } from "lucide-react";
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
    >
      {/* Form Group matching sign-in layout, pill inputs, and sequential animations */}
      <div className="mt-12">
        {error && (
          <div className="mb-5">
            <ErrorAlert message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="animate-auth-group grid grid-cols-2 gap-1.5 rounded-full border border-interlink-border/90 bg-interlink-surface/85 p-1 shadow-subtle backdrop-blur-sm">
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

          <div className="animate-auth-group-delay-1 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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

          <div className="animate-auth-group-delay-2 space-y-3.5">
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
          </div>

          <div className="animate-auth-group-delay-3 pt-2">
            <AuthSubmitButton
              loading={loading}
              label="Sign Up"
              loadingLabel="Creating account..."
            />
          </div>
        </form>

        <p className="animate-auth-group-delay-3 mt-7 text-center text-xs text-interlink-muted">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-interlink-forest transition-colors hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function SignUpPage() {
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
      <SignUpInner />
    </Suspense>
  );
}
