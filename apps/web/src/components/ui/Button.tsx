import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "outline" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-interlink-forest text-white border border-interlink-forest shadow-subtle hover:bg-interlink-forest-hover hover:shadow-elevated",
  outline:
    "bg-interlink-surface text-interlink-ink border border-interlink-hairline shadow-subtle hover:border-interlink-forest hover:text-interlink-forest",
  secondary:
    "bg-interlink-app-bg text-interlink-ink border border-interlink-border hover:bg-interlink-border/30",
  ghost:
    "bg-transparent text-interlink-ink border border-transparent hover:bg-interlink-app-bg",
  destructive:
    "bg-red-600 text-white border border-red-600 shadow-subtle hover:bg-red-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
  lg: "px-6 py-2.5 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[2px] font-medium transition-all duration-200 active:scale-[0.99] focus-ring disabled:cursor-not-allowed disabled:opacity-55 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
