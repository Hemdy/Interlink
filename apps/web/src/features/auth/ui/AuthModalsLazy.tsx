"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Lock, LogIn, Mail, User, Users } from "lucide-react";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";
import {
  AuthBottomCard,
  AuthDivider,
  AuthModalCard,
  AuthPillInput,
  AuthSubmitButton,
} from "./AuthShell";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { resetClientSessionAndNavigate } from "./SessionSyncGuard";

export type AuthModalView = "sign-in" | "sign-up" | "forgot-password" | null;

const MODAL_CONTAINER_CLASS =
  "rounded-3xl border border-interlink-border/90 bg-interlink-canvas shadow-modal";

export default function AuthModalsLazy({
  view,
  setView,
  role,
  setRole,
  closeAuthModal,
}: {
  view: AuthModalView;
  setView: (view: AuthModalView) => void;
  role: "mentee" | "mentor";
  setRole: (role: "mentee" | "mentor") => void;
  closeAuthModal: () => void;
}) {
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfoMessage(null);
    setDevLink(null);
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await postJson(
        "/api/v1/auth/login",
        { identifier, password: loginPassword },
        "Unable to sign in.",
      );
      if (!result.ok) {
        setError(result.errorMessage ?? "Unable to sign in.");
        return;
      }
      pushToast({ kind: "success", title: "Signed in to Interlink" });
      closeAuthModal();
      resetClientSessionAndNavigate("/dashboard");
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const result = await postJson<{ devVerificationUrl?: string }>(
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
        "Unable to create your account.",
      );
      if (!result.ok) {
        setError(result.errorMessage ?? "Unable to create your account.");
        return;
      }
      pushToast({
        kind: "success",
        title: "Account created",
        description:
          "Welcome to Interlink! You can customize your profile anytime from your dashboard.",
      });
      closeAuthModal();
      resetClientSessionAndNavigate("/dashboard");
    } catch {
      setError("Network error while creating your account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setDevLink(null);
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
        setError(json.error?.message ?? "Unable to process password reset.");
        return;
      }
      setInfoMessage(
        json.data?.message ?? "If an account exists, reset instructions have been issued.",
      );
      if (json.data?.devResetUrl) {
        setDevLink(json.data.devResetUrl);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal
        open={view === "sign-in"}
        onClose={closeAuthModal}
        title="Sign In to Interlink"
        maxWidthClass="max-w-[460px]"
        containerClassName={MODAL_CONTAINER_CLASS}
      >
        <AuthModalCard
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
                closeAuthModal();
                resetClientSessionAndNavigate("/dashboard");
              }}
            />
          </div>

          <AuthDivider label="or continue with email" />

          <form onSubmit={handleLogin} className="space-y-3.5">
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
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <AuthSubmitButton loading={loading} label="Login" loadingLabel="Signing in..." />
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setView("forgot-password");
              }}
              className="text-xs font-semibold text-interlink-forest hover:underline"
            >
              Forgot Password?
            </button>

            <div className="mx-auto my-3.5 h-px w-48 bg-gradient-to-r from-transparent via-interlink-border to-transparent" />

            <p className="text-xs text-interlink-muted">
              View{" "}
              <Link
                href="/legal/terms"
                onClick={closeAuthModal}
                className="font-medium text-interlink-forest hover:underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/terms"
                onClick={closeAuthModal}
                className="font-medium text-interlink-forest hover:underline"
              >
                Condition
              </Link>
            </p>
          </div>

          <AuthBottomCard
            icon={Users}
            title="New here?"
            description="Sign Up and get linked with mentors world wide"
            ctaLabel="Sign Up"
            onCtaClick={() => {
              resetMessages();
              setView("sign-up");
            }}
          />
        </AuthModalCard>
      </Modal>

      <Modal
        open={view === "sign-up"}
        onClose={closeAuthModal}
        title="Create Your Account"
        maxWidthClass="max-w-[460px]"
        containerClassName={MODAL_CONTAINER_CLASS}
      >
        <AuthModalCard
          titleLeading="Create"
          titleHighlight="Account"
          subtitle="Start your mentorship journey as a mentee or mentor."
        >
          <div
            className="mt-6 grid grid-cols-2 gap-1.5 rounded-full border border-interlink-border/90 bg-interlink-surface/85 p-1 shadow-subtle backdrop-blur-sm"
            role="group"
            aria-label="Select your role"
          >
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
                closeAuthModal();
                resetClientSessionAndNavigate("/dashboard");
              }}
            />
          </div>

          <AuthDivider label="or register with email" />

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AuthPillInput
                icon={User}
                name="firstName"
                type="text"
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
                type="text"
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

            <AuthSubmitButton
              loading={loading}
              label="Sign Up"
              loadingLabel="Creating account..."
            />
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-interlink-muted">
            By clicking Sign Up, you agree to our{" "}
            <Link
              href="/legal/terms"
              onClick={closeAuthModal}
              className="font-medium text-interlink-forest hover:underline"
            >
              Terms and Condition
            </Link>
            . Learn how to process your data in our{" "}
            <Link
              href="/legal/privacy"
              onClick={closeAuthModal}
              className="font-medium text-interlink-forest hover:underline"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/cookies"
              onClick={closeAuthModal}
              className="font-medium text-interlink-forest hover:underline"
            >
              Cookie Policy
            </Link>
            .
          </p>

          <AuthBottomCard
            icon={LogIn}
            title="Already have an account?"
            description="Sign in to access your mentorship workspace"
            ctaLabel="Sign In"
            onCtaClick={() => {
              resetMessages();
              setView("sign-in");
            }}
          />
        </AuthModalCard>
      </Modal>

      <Modal
        open={view === "forgot-password"}
        onClose={closeAuthModal}
        title="Reset Your Password"
        maxWidthClass="max-w-[440px]"
        containerClassName={MODAL_CONTAINER_CLASS}
      >
        <AuthModalCard
          topLeftSlot={
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setView("sign-in");
              }}
              aria-label="Go back to sign in"
              className="inline-flex items-center gap-1.5 rounded-full border border-interlink-border/90 bg-interlink-surface/85 px-3.5 py-1.5 text-xs font-semibold text-interlink-ink shadow-subtle backdrop-blur-sm transition-colors hover:border-interlink-forest hover:text-interlink-forest focus-ring"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back</span>
            </button>
          }
          titleLeading="Forgot"
          titleHighlight="Password?"
          subtitle="Enter your account email address and we will issue a reset link."
        >
          {error && (
            <div className="mt-5">
              <ErrorAlert message={error} />
            </div>
          )}

          {infoMessage && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs leading-relaxed text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <p>{infoMessage}</p>
              {devLink && (
                <Link
                  href={devLink}
                  onClick={closeAuthModal}
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-interlink-forest underline"
                >
                  <span>Open password reset page</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="mt-6 space-y-3.5">
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

          <AuthBottomCard
            icon={LogIn}
            title="Remember your password?"
            description="Return to sign in with your existing credentials"
            ctaLabel="Sign In"
            onCtaClick={() => {
              resetMessages();
              setView("sign-in");
            }}
          />
        </AuthModalCard>
      </Modal>
    </>
  );
}
