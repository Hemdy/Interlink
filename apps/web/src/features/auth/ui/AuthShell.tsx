"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { InterlinkLogo } from "@/components/ui/InterlinkLogo";

interface AuthShellProps {
  logoHref?: string;
  topLeftSlot?: React.ReactNode;
  titleLeading: string;
  titleHighlight: string;
  subtitle: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function AuthBackdrop({ compact = false }: { compact?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        className={`absolute -left-24 -top-24 h-72 w-72 rounded-full bg-interlink-forest/30 blur-3xl ${
          compact ? "" : "md:h-96 md:w-96"
        }`}
      />
      <div
        className={`absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-interlink-forest-deep/35 blur-3xl ${
          compact ? "" : "md:h-80 md:w-80"
        }`}
      />
      <div
        className={`absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-interlink-forest-card/25 blur-3xl ${
          compact ? "" : "md:h-96 md:w-96"
        }`}
      />
      <div
        className={`absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-interlink-gold/10 blur-3xl ${
          compact ? "" : "md:h-72 md:w-72"
        }`}
      />

      {/* Subtle curved architectural flow lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.22]"
        viewBox="0 0 390 844"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M-40 160 C 90 110, 170 20, 320 -20"
          stroke="rgb(var(--il-forest))"
          strokeWidth="1.5"
        />
        <path
          d="M-20 195 C 120 140, 210 60, 390 15"
          stroke="rgb(var(--il-sage))"
          strokeWidth="1"
        />
        <path
          d="M-40 760 C 120 690, 260 770, 420 695"
          stroke="rgb(var(--il-forest))"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export function AuthShell({
  logoHref = "/",
  topLeftSlot,
  titleLeading,
  titleHighlight,
  subtitle,
  maxWidthClass = "max-w-[440px]",
  children,
}: AuthShellProps) {
  return (
    <div className="dark [color-scheme:dark]">
      <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-interlink-canvas px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.75rem+env(safe-area-inset-top))] text-interlink-ink md:items-center md:justify-center md:px-6 md:py-12">
        <AuthBackdrop />

        {/* Main Content Container (Borderless on mobile, refined surface card on md+) */}
        <div
          className={`relative z-10 mx-auto flex w-full ${maxWidthClass} flex-1 flex-col justify-center md:flex-initial`}
        >
          {topLeftSlot && <div className="mb-4 flex items-center justify-start">{topLeftSlot}</div>}

          <div className="md:rounded-3xl md:border md:border-interlink-border/90 md:bg-interlink-surface/75 md:p-9 md:shadow-modal md:backdrop-blur-xl">
            {/* Top Brand Lockup */}
            <div className="mb-7 text-center">
              <Link
                href={logoHref}
                className="inline-flex items-center justify-center rounded-[4px] px-2 py-1 focus-ring"
              >
                <InterlinkLogo variant="compact" />
              </Link>
            </div>

            {/* Two-Tone Greeting */}
            <div className="text-center">
              <h1 className="font-display text-[30px] font-bold leading-tight tracking-tight text-interlink-ink">
                {titleLeading} <span className="text-interlink-forest">{titleHighlight}</span>
              </h1>
              <p className="mt-2.5 text-sm text-interlink-muted">{subtitle}</p>
              <div
                aria-hidden="true"
                className="mx-auto mt-4 h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-interlink-forest to-transparent shadow-[0_0_12px_rgba(59,104,70,0.45)]"
              />
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthModalCard({
  topLeftSlot,
  titleLeading,
  titleHighlight,
  subtitle,
  children,
}: {
  topLeftSlot?: React.ReactNode;
  titleLeading: string;
  titleHighlight: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="dark [color-scheme:dark]">
      <div className="relative overflow-hidden bg-interlink-canvas p-6 text-interlink-ink sm:p-8">
        <AuthBackdrop compact />

        <div className="relative z-10">
          {topLeftSlot && <div className="mb-3 flex items-center justify-start">{topLeftSlot}</div>}

          <div className="mb-5 text-center">
            <span className="inline-flex items-center justify-center">
              <InterlinkLogo variant="compact" />
            </span>
          </div>

          <div className="text-center">
            <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-interlink-ink sm:text-[28px]">
              {titleLeading} <span className="text-interlink-forest">{titleHighlight}</span>
            </h2>
            <p className="mt-1.5 text-sm text-interlink-muted">{subtitle}</p>
            <div
              aria-hidden="true"
              className="mx-auto mt-3.5 h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-interlink-forest to-transparent shadow-[0_0_12px_rgba(59,104,70,0.45)]"
            />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-interlink-border" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-interlink-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-interlink-border" />
    </div>
  );
}

interface AuthPillInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ComponentType<{ className?: string }>;
  showPasswordToggle?: boolean;
}

export function AuthPillInput({
  icon: Icon,
  showPasswordToggle = false,
  type = "text",
  className = "",
  ...rest
}: AuthPillInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div
      className={`flex items-center gap-3 rounded-full border border-interlink-border/90 bg-interlink-surface/90 px-4 py-3 shadow-subtle backdrop-blur-sm transition-all focus-within:border-interlink-forest focus-within:ring-2 focus-within:ring-interlink-forest/20 ${className}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-interlink-muted" aria-hidden="true" />
      <input
        type={resolvedType}
        {...rest}
        className="w-full min-w-0 bg-transparent text-base text-interlink-ink placeholder:text-interlink-muted focus:outline-none sm:text-sm"
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="shrink-0 rounded-full p-0.5 text-interlink-muted transition-colors hover:text-interlink-ink focus-ring"
        >
          {showPassword ? (
            <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}

export function AuthSubmitButton({
  loading,
  label,
  loadingLabel,
  className = "",
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`relative mt-1 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-interlink-forest via-interlink-forest-card to-interlink-forest-deep py-3.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(50,93,60,0.3)] transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-ring ${className}`}
    >
      <span>{loading ? loadingLabel : label}</span>
      <ArrowRight className="absolute right-5 h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function AuthBottomCard({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  onCtaClick?: () => void;
}) {
  const ctaClassName =
    "inline-flex shrink-0 items-center gap-1 rounded-full border border-interlink-forest/40 bg-interlink-surface px-3.5 py-2 text-xs font-semibold text-interlink-ink shadow-sm transition-colors hover:border-interlink-forest hover:bg-interlink-forest hover:text-white focus-ring";

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-interlink-border/90 bg-interlink-surface/75 p-3.5 shadow-subtle backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-interlink-forest/20 bg-gradient-to-br from-interlink-forest/15 to-interlink-sage/20 text-interlink-forest shadow-sm">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-interlink-ink">{title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-interlink-muted">
            {description}
          </p>
        </div>
      </div>

      {onCtaClick ? (
        <button type="button" onClick={onCtaClick} className={ctaClassName}>
          <span>{ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        <Link href={ctaHref ?? "/sign-in"} className={ctaClassName}>
          <span>{ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
