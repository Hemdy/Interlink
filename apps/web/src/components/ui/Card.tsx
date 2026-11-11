import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  elevated?: boolean;
}

export function Card({
  padded = true,
  elevated = false,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-[2px] border border-interlink-border/80 bg-interlink-surface text-interlink-ink transition-all duration-200 ${
        elevated ? "shadow-elevated" : "shadow-subtle"
      } ${padded ? "p-6" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type BadgeTone = "forest" | "neutral" | "gold" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<BadgeTone, string> = {
  forest:
    "bg-interlink-forest/10 text-interlink-forest border-interlink-forest/30 dark:bg-interlink-forest/20 dark:text-emerald-300",
  neutral:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-interlink-border",
  gold:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
  warning:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
  danger:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60",
  info:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
