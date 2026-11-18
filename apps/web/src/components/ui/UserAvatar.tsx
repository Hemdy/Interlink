"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn } from "lucide-react";

export function resolveAvatarSrc(profileImage?: string | null): string | null {
  if (!profileImage) return null;
  const trimmed = profileImage.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `/api/v1/storage/file?key=${encodeURIComponent(trimmed)}`;
}

const SIZE_CLASSES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-lg",
} as const;

export function UserAvatar({
  src,
  firstName,
  lastName,
  size = "md",
  className = "",
  previewable = false,
  previewSubtitle,
}: {
  src?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  previewable?: boolean;
  previewSubtitle?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const resolved = resolveAvatarSrc(src);
  const showImage = Boolean(resolved && failedSrc !== resolved);
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";
  const fullName = `${firstName} ${lastName}`.trim() || "User";
  const canPreview = previewable && showImage && Boolean(resolved);

  useEffect(() => {
    if (!previewOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen]);

  const avatarContent = showImage && resolved ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={fullName}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setFailedSrc(resolved)}
    />
  ) : (
    <span aria-hidden="true">{initials}</span>
  );

  const baseFrameClass = `flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-interlink-border/90 bg-interlink-app-bg font-semibold text-interlink-forest ${SIZE_CLASSES[size]} ${className}`;

  return (
    <>
      {canPreview ? (
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Preview ${fullName}'s profile photograph`}
          className={`${baseFrameClass} group relative cursor-zoom-in transition-all duration-200 hover:border-interlink-forest hover:shadow-elevated focus-ring`}
        >
          {avatarContent}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/35 group-hover:opacity-100"
          >
            <ZoomIn className="h-4 w-4 drop-shadow" />
          </span>
        </button>
      ) : (
        <div className={baseFrameClass}>{avatarContent}</div>
      )}

      {previewOpen &&
        resolved &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${fullName} profile photograph preview`}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
            onClick={() => setPreviewOpen(false)}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-interlink-surface shadow-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-interlink-border px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-interlink-ink sm:text-base">
                    {fullName}
                  </p>
                  {previewSubtitle && (
                    <p className="truncate text-xs text-interlink-muted">{previewSubtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Close image preview"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-interlink-border bg-interlink-app-bg text-interlink-ink transition-colors hover:border-interlink-forest hover:bg-interlink-forest hover:text-white focus-ring"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex items-center justify-center bg-black/95 p-3 sm:p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolved}
                  alt={fullName}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-elevated"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
