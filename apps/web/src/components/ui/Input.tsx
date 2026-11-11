import React from "react";
export { Select, type SelectOption, type SelectProps } from "./Select";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-interlink-ink">
          {label}
          {props.required && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={`w-full rounded-[2px] border bg-interlink-surface px-3.5 py-2.5 text-sm text-interlink-ink shadow-subtle placeholder:text-interlink-muted/75 transition-colors focus:border-interlink-forest focus:outline-none focus:ring-1 focus:ring-interlink-forest disabled:opacity-60 ${
          error ? "border-red-500" : "border-interlink-border"
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-interlink-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className = "", rows = 4, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-interlink-ink">
          {label}
          {props.required && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? "true" : undefined}
        className={`w-full rounded-[2px] border bg-interlink-surface px-3.5 py-2.5 text-sm text-interlink-ink shadow-subtle placeholder:text-interlink-muted/75 transition-colors focus:border-interlink-forest focus:outline-none focus:ring-1 focus:ring-interlink-forest disabled:opacity-60 ${
          error ? "border-red-500" : "border-interlink-border"
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="mt-1 text-xs text-interlink-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});
