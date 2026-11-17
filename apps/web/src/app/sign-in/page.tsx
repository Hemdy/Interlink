"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";
import { GoogleAuthButton } from "@/features/auth/ui/GoogleAuthButton";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const redirectTarget = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const { pushToast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError("Network error while signing in.");
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

      <div className="grid w-full max-w-[740px] grid-cols-1 overflow-hidden rounded-[2px] shadow-modal md:grid-cols-2">
        <div className="bg-interlink-modal p-8 sm:p-11">
          <h1 className="text-center font-display text-2xl font-bold text-interlink-forest">
            Welcome
          </h1>
          <p className="mt-1 text-center font-display text-xl font-light text-interlink-ink">
            Sign In Here.
          </p>

          {error && (
            <div className="mt-5">
              <ErrorAlert message={error} />
            </div>
          )}

          <div className="mt-6">
            <GoogleAuthButton
              label="Continue with Google"
              onSuccess={() => {
                router.push(redirectTarget);
                router.refresh();
              }}
            />
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-interlink-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
              <span className="bg-interlink-modal px-2 text-interlink-muted">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="flex items-center justify-between pt-2">
              <Button type="submit" loading={loading} className="px-6">
                Login
              </Button>
              <Link href="/reset-password" className="text-xs font-medium text-interlink-link hover:underline">
                Forgot Password?
              </Link>
            </div>
          </form>

          <p className="mt-7 text-center text-xs text-interlink-muted">
            View{" "}
            <Link href="/legal/terms" className="text-interlink-link hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/terms" className="text-interlink-link hover:underline">
              Condition
            </Link>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center bg-interlink-forest-deep p-8 text-center text-white sm:p-11">
          <h2 className="font-display text-2xl font-bold">New here?</h2>
          <p className="mt-3 max-w-[230px] text-sm font-light leading-relaxed text-white/90">
            Sign Up and get linked with mentors world wide
          </p>
          <Link
            href="/sign-up"
            className="mt-7 rounded-[2px] bg-white px-7 py-2 text-sm font-semibold text-slate-900 shadow-subtle transition-colors hover:bg-slate-100 focus-ring"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-interlink-sage/85">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-interlink-forest border-t-transparent" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
