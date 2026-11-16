"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function GoogleAuthButton({
  role = "mentee",
  label = "Continue with Google",
  onSuccess,
  className = "",
}: {
  role?: "mentee" | "mentor";
  label?: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleEmail, setGoogleEmail] = useState("");
  const [googleFullName, setGoogleFullName] = useState("");

  async function handleGoogleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setError("Please enter your Google account email.");
      return;
    }

    setLoading(true);
    setError(null);

    const parts = googleFullName.trim().split(/\s+/);
    const firstName = parts[0] || googleEmail.split("@")[0] || "User";
    const lastName = parts.slice(1).join(" ") || "";

    try {
      const result = await postJson<{ isNew: boolean; user: { firstName: string } }>(
        "/api/v1/auth/google",
        {
          email: googleEmail.trim().toLowerCase(),
          firstName,
          lastName,
          role,
        },
        "Unable to authenticate with Google.",
      );

      if (!result.ok) {
        setError(result.errorMessage ?? "Google authentication failed.");
        return;
      }

      setModalOpen(false);
      pushToast({
        kind: "success",
        title: result.data?.isNew ? "Account created with Google" : "Signed in with Google",
        description: `Welcome to Interlink, ${result.data?.user.firstName ?? firstName}!`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error authenticating with Google.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAccount(account: { email: string; name: string }) {
    setGoogleEmail(account.email);
    setGoogleFullName(account.name);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setModalOpen(true);
        }}
        className={`flex w-full items-center justify-center gap-2.5 rounded-[2px] border border-interlink-border bg-interlink-surface px-4 py-2.5 text-sm font-medium text-interlink-ink shadow-subtle transition-all duration-200 hover:border-interlink-forest hover:bg-interlink-app-bg focus-ring ${className}`}
      >
        <GoogleIcon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Sign in with Google"
        maxWidthClass="max-w-[420px]"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink">
          <div className="flex items-center gap-3 border-b border-interlink-border/80 pb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-interlink-border bg-white shadow-subtle dark:bg-slate-900">
              <GoogleIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-interlink-ink">
                Sign in with Google
              </h3>
              <p className="text-xs text-interlink-muted">
                to continue to <span className="font-medium text-interlink-forest">InterLink</span>
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4">
              <ErrorAlert message={error} />
            </div>
          )}

          {/* Quick Select demo Google accounts for rapid one-click testing */}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-medium text-interlink-muted">
              Choose an account or enter your Google email:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: "Alex Morgan", email: "alex.morgan@gmail.com" },
                { name: "Dr. Amara Okafor", email: "amara.okafor@gmail.com" },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickAccount(acc)}
                  className={`flex items-center justify-between rounded-[2px] border p-2.5 text-left text-xs transition-colors ${
                    googleEmail === acc.email
                      ? "border-interlink-forest bg-interlink-forest/10 text-interlink-forest"
                      : "border-interlink-border bg-interlink-app-bg/50 text-interlink-ink hover:border-interlink-forest/50"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{acc.name}</p>
                    <p className="text-[11px] text-interlink-muted">{acc.email}</p>
                  </div>
                  <span className="text-[10px] text-interlink-forest font-medium">Select</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGoogleSubmit} className="mt-4 space-y-3.5">
            <Input
              label="Google Email Address"
              name="googleEmail"
              type="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              required
            />
            <Input
              label="Full Name (as on Google profile)"
              name="googleName"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              value={googleFullName}
              onChange={(e) => setGoogleFullName(e.target.value)}
            />

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-[2px] border border-interlink-border px-3.5 py-1.5 text-xs font-medium text-interlink-muted hover:text-interlink-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !googleEmail.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-[2px] bg-interlink-forest px-4 py-1.5 text-xs font-semibold text-white shadow-subtle hover:bg-interlink-forest-hover disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Continue to InterLink"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
