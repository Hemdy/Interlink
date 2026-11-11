"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@interlink/types";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

type AuthModalView = "sign-in" | "sign-up" | "forgot-password" | null;

interface AuthModalContextValue {
  openSignIn: () => void;
  openSignUp: (defaultRole?: "mentee" | "mentor") => void;
  openForgotPassword: () => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used inside AuthModalProvider");
  }
  return ctx;
}

export function AuthModalProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [view, setView] = useState<AuthModalView>(null);
  const [role, setRole] = useState<"mentee" | "mentor">("mentee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Sign-in state
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign-up state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setInfoMessage(null);
    setDevLink(null);
  };

  const openSignIn = useCallback(() => {
    resetMessages();
    setView("sign-in");
  }, []);

  const openSignUp = useCallback((defaultRole: "mentee" | "mentor" = "mentee") => {
    resetMessages();
    setRole(defaultRole);
    setView("sign-up");
  }, []);

  const openForgotPassword = useCallback(() => {
    resetMessages();
    setView("forgot-password");
  }, []);

  const closeAuthModal = useCallback(() => {
    setView(null);
    resetMessages();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: loginPassword }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to sign in.");
        return;
      }
      pushToast({ kind: "success", title: "Signed in to Interlink" });
      closeAuthModal();
      router.push("/dashboard");
      router.refresh();
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
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          confirmPassword,
          role,
          acceptPolicies: true,
        }),
      });
      const json = (await res.json()) as {
        data?: { devVerificationUrl?: string };
        error?: { message: string };
      };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to create your account.");
        return;
      }
      pushToast({
        kind: "success",
        title: "Account created",
        description: "Let's complete your Interlink onboarding profile.",
      });
      closeAuthModal();
      if (json.data?.devVerificationUrl) {
        router.push(`/onboarding?verifyNotice=1`);
      } else {
        router.push("/onboarding");
      }
      router.refresh();
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

  void initialUser;

  return (
    <AuthModalContext.Provider
      value={{ openSignIn, openSignUp, openForgotPassword, closeAuthModal }}
    >
      {children}

      {/* SIGN IN MODAL — Reference Image 2 */}
      <Modal
        open={view === "sign-in"}
        onClose={closeAuthModal}
        title="Sign In to Interlink"
        maxWidthClass="max-w-[740px]"
      >
        <div className="grid grid-cols-1 overflow-hidden rounded-[2px] md:grid-cols-2">
          <div className="bg-interlink-modal p-8 sm:p-11">
            <h2 className="text-center font-display text-2xl font-bold text-interlink-forest">
              Welcome
            </h2>
            <p className="mt-1 text-center font-display text-xl font-light text-interlink-ink">
              Sign In Here.
            </p>

            {error && (
              <div className="mt-5">
                <ErrorAlert message={error} />
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-7 space-y-4">
              <Input
                name="identifier"
                type="text"
                placeholder="E-mail or Username"
                aria-label="E-mail or Username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
              <Input
                name="password"
                type="password"
                placeholder="Password"
                aria-label="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between pt-2">
                <Button type="submit" loading={loading} className="px-6">
                  Login
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setView("forgot-password");
                  }}
                  className="text-xs font-medium text-interlink-link hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </form>

            <p className="mt-7 text-center text-xs text-interlink-muted">
              View{" "}
              <Link
                href="/legal/terms"
                onClick={closeAuthModal}
                className="text-interlink-link hover:underline"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                href="/legal/terms"
                onClick={closeAuthModal}
                className="text-interlink-link hover:underline"
              >
                Condition
              </Link>
            </p>
          </div>

          <div className="flex flex-col items-center justify-center bg-interlink-forest-deep p-8 text-center text-white sm:p-11">
            <h3 className="font-display text-2xl font-bold">New here?</h3>
            <p className="mt-3 max-w-[230px] text-sm font-light leading-relaxed text-white/90">
              Sign Up and get linked with mentors world wide
            </p>
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setView("sign-up");
              }}
              className="mt-7 rounded-[2px] bg-white px-7 py-2 text-sm font-medium text-interlink-ink transition-colors hover:bg-slate-100 focus-ring"
            >
              Sign Up
            </button>
          </div>
        </div>
      </Modal>

      {/* SIGN UP MODAL — Reference Image 3 */}
      <Modal
        open={view === "sign-up"}
        onClose={closeAuthModal}
        title="Create Your Account"
        maxWidthClass="max-w-[440px]"
      >
        <div className="rounded-[2px] bg-interlink-modal p-8 sm:p-10">
          <h2 className="text-center font-display text-2xl font-bold text-interlink-forest">
            Welcome
          </h2>
          <p className="mt-1 text-center font-display text-xl font-light text-interlink-ink">
            Create Your Account
          </p>

          <div
            className="mt-5 grid grid-cols-2 gap-1.5 rounded-[2px] border border-interlink-border bg-interlink-surface p-1"
            role="group"
            aria-label="Select your role"
          >
            <button
              type="button"
              onClick={() => setRole("mentee")}
              className={`rounded-[2px] py-1.5 text-xs font-medium transition-colors ${
                role === "mentee"
                  ? "bg-interlink-forest text-white"
                  : "text-interlink-muted hover:bg-interlink-app-bg hover:text-interlink-ink"
              }`}
            >
              Join as Mentee
            </button>
            <button
              type="button"
              onClick={() => setRole("mentor")}
              className={`rounded-[2px] py-1.5 text-xs font-medium transition-colors ${
                role === "mentor"
                  ? "bg-interlink-forest text-white"
                  : "text-interlink-muted hover:bg-interlink-app-bg hover:text-interlink-ink"
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

          <form onSubmit={handleRegister} className="mt-5 space-y-3">
            <Input
              name="firstName"
              type="text"
              placeholder="First Name"
              aria-label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
            <Input
              name="lastName"
              type="text"
              placeholder="Last Name"
              aria-label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
            <Input
              name="email"
              type="email"
              placeholder="E-mail"
              aria-label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              name="password"
              type="password"
              placeholder="Create Password"
              aria-label="Create Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <div className="pt-2 text-center">
              <Button type="submit" loading={loading} className="min-w-[130px] px-8">
                Sign Up
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-interlink-muted">
            By clicking Sign Up, you agree to our{" "}
            <Link
              href="/legal/terms"
              onClick={closeAuthModal}
              className="text-interlink-link underline"
            >
              Terms and Condition
            </Link>
            . Learn how to process your data in our{" "}
            <Link
              href="/legal/privacy"
              onClick={closeAuthModal}
              className="text-interlink-link underline"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/cookies"
              onClick={closeAuthModal}
              className="text-interlink-link underline"
            >
              Cookie Policy
            </Link>
            .
          </p>

          <p className="mt-4 text-center text-xs text-interlink-muted">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                resetMessages();
                setView("sign-in");
              }}
              className="font-medium text-interlink-forest hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </Modal>

      {/* FORGOT PASSWORD MODAL */}
      <Modal
        open={view === "forgot-password"}
        onClose={closeAuthModal}
        title="Reset Your Password"
        maxWidthClass="max-w-[440px]"
      >
        <div className="rounded-[2px] bg-interlink-modal p-8 sm:p-10">
          <h2 className="text-center font-display text-2xl font-bold text-interlink-forest">
            Recover Password
          </h2>
          <p className="mt-1 text-center text-sm font-light text-interlink-muted">
            Enter your account email address and we will issue a reset link.
          </p>

          {error && (
            <div className="mt-4">
              <ErrorAlert message={error} />
            </div>
          )}

          {infoMessage && (
            <div className="mt-4 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p>{infoMessage}</p>
              {devLink && (
                <Link
                  href={devLink}
                  onClick={closeAuthModal}
                  className="mt-2 inline-block font-medium text-interlink-forest underline"
                >
                  Open password reset page
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="mt-6 space-y-4">
            <Input
              name="forgotEmail"
              type="email"
              placeholder="E-mail"
              aria-label="E-mail"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setView("sign-in");
                }}
                className="text-xs font-medium text-slate-600 hover:text-interlink-ink"
              >
                Back to Sign In
              </button>
              <Button type="submit" loading={loading}>
                Send Reset Link
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </AuthModalContext.Provider>
  );
}
