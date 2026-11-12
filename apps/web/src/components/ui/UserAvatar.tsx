"use client";

import React, { useState } from "react";

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
}: {
  src?: string | null;
  firstName: string;
  lastName: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolved = resolveAvatarSrc(src);
  const showImage = Boolean(resolved && failedSrc !== resolved);
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "U";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-interlink-border bg-interlink-app-bg font-semibold text-interlink-forest ${SIZE_CLASSES[size]} ${className}`}
    >
      {showImage && resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(resolved)}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
