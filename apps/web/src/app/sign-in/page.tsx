"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";

export default function SignInPage() {
  const router = useRouter();
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
      router.push("/dashboard");
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

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Input
              name="identifier"
              type="text"
              placeholder="E-mail or Username"
              aria-label="E-mail or Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            className="mt-7 rounded-[2px] bg-white px-7 py-2 text-sm font-medium text-interlink-ink hover:bg-slate-100"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
