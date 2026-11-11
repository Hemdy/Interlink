import React from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-interlink-muted">
      <Loader2 className="h-5 w-5 animate-spin text-interlink-forest" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorAlert({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[2px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-red-700 dark:text-red-300">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-interlink-border bg-interlink-surface px-6 py-12 text-center shadow-subtle">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[2px] bg-interlink-forest/10 text-interlink-forest">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-interlink-ink">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-interlink-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
