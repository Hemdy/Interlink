"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { useToast } from "@/components/ui/ToastProvider";

function SignUpInner() {
  const router = useRouter();
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

  async function handleSubmit(e: React.FormEvent) {
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
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to register.");
        return;
      }
      pushToast({ kind: "success", title: "Account created!" });
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Network error creating account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-interlink-sage/85 px-4 py-10">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-block rounded-[2px] border border-interlink-border bg-interlink-surface px-4 py-2 shadow-subtle"
        >
          <InterlinkLogo variant="compact" />
        </Link>
      </div>

      <div className="w-full max-w-[440px] rounded-[2px] bg-interlink-modal p-8 shadow-modal sm:p-10">
        <h1 className="text-center font-display text-2xl font-bold text-interlink-forest">
          Welcome
        </h1>
        <p className="mt-1 text-center font-display text-xl font-light text-interlink-ink">
          Create Your Account
        </p>

        <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-[2px] border border-interlink-border bg-interlink-surface p-1">
          <button
            type="button"
            onClick={() => setRole("mentee")}
            className={`rounded-[2px] py-1.5 text-xs font-medium transition-colors ${
              role === "mentee" ? "bg-interlink-forest text-white" : "text-interlink-muted hover:text-interlink-ink"
            }`}
          >
            Join as Mentee
          </button>
          <button
            type="button"
            onClick={() => setRole("mentor")}
            className={`rounded-[2px] py-1.5 text-xs font-medium transition-colors ${
              role === "mentor" ? "bg-interlink-forest text-white" : "text-interlink-muted hover:text-interlink-ink"
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <Input
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
          <div className="pt-2 text-center">
            <Button type="submit" loading={loading} className="min-w-[130px] px-8">
              Sign Up
            </Button>
          </div>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-interlink-muted">
          By clicking Sign Up, you agree to our{" "}
          <Link href="/legal/terms" className="text-interlink-link underline">
            Terms and Condition
          </Link>
          . Learn how to process your data in our{" "}
          <Link href="/legal/privacy" className="text-interlink-link underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/cookies" className="text-interlink-link underline">
            Cookie Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-xs text-interlink-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-interlink-forest hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SignUpInner />
    </Suspense>
  );
}
