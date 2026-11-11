"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-interlink-sage/40 px-4">
      <div className="w-full max-w-md rounded-[2px] bg-interlink-modal p-8 shadow-modal">
        <div className="flex justify-center">
          <InterlinkLogo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-interlink-forest">
          Reset Password
        </h1>

        {done ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-interlink-forest" />
            <p className="mt-3 text-sm text-interlink-ink">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-block rounded-[2px] bg-interlink-forest px-6 py-2 text-sm font-medium text-white hover:bg-interlink-forest-hover"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <ErrorAlert message={error} />}
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
            <Button type="submit" loading={loading} className="w-full">
              Update Password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
