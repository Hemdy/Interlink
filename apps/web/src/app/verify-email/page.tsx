"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert, LoadingSpinner } from "@/components/ui/Feedback";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token ? "verifying" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { error?: { message: string } };
        if (!active) return;
        if (!res.ok) {
          setError(json.error?.message ?? "Verification failed.");
          setStatus("error");
        } else {
          setStatus("success");
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Network error verifying email.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-interlink-sage/30 px-4">
      <div className="w-full max-w-md rounded-[2px] border border-interlink-border bg-interlink-surface p-8 shadow-card">
        <div className="flex justify-center">
          <InterlinkLogo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-interlink-forest">
          Email Verification
        </h1>

        {status === "verifying" && <LoadingSpinner label="Verifying your email address..." />}

        {status === "success" && (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-interlink-forest" />
            <p className="mt-3 text-sm text-interlink-ink">
              Your email address has been verified successfully.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-[2px] bg-interlink-forest px-6 py-2 text-sm font-medium text-white hover:bg-interlink-forest-hover"
            >
              Continue to Dashboard
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 space-y-4">
            <ErrorAlert message={error ?? "Invalid verification token."} />
            <Link
              href="/dashboard"
              className="block text-center text-xs font-medium text-interlink-forest hover:underline"
            >
              Return to Dashboard
            </Link>
          </div>
        )}

        {status === "idle" && (
          <div className="mt-6 text-center text-sm text-interlink-muted">
            <p>Open the verification link sent to your email, or request a new link from settings.</p>
            <div className="mt-5">
              <Link href="/settings">
                <Button variant="outline">Go to Account Settings</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
