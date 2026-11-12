"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { ErrorAlert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveAvatarSrc, UserAvatar } from "@/components/ui/UserAvatar";

async function compressAvatarIfNeeded(file: File): Promise<File> {
  if (file.size <= 350 * 1024) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = 512;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        0.86,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export function AvatarUploadCard({
  firstName,
  lastName,
  initialProfileImage,
  onUploaded,
  compact = false,
}: {
  firstName: string;
  lastName: string;
  initialProfileImage?: string | null;
  onUploaded?: (newUrl: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    resolveAvatarSrc(initialProfileImage),
  );

  useEffect(() => {
    setAvatarUrl(resolveAvatarSrc(initialProfileImage));
  }, [initialProfileImage]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;

    setUploading(true);
    setError(null);
    try {
      const preparedFile = await compressAvatarIfNeeded(selected);
      const form = new FormData();
      form.append("file", preparedFile);
      form.append("purpose", "avatar");

      const res = await fetch("/api/v1/storage/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });

      const rawText = await res.text();
      let json: { data?: { signedUrl?: string; key?: string }; error?: { message?: string } } = {};
      if (rawText) {
        try {
          json = JSON.parse(rawText) as typeof json;
        } catch {
          json = {};
        }
      }

      if (!res.ok) {
        setError(json.error?.message ?? `Unable to upload profile photo (HTTP ${res.status}).`);
        return;
      }

      const nextUrl = json.data?.signedUrl ?? resolveAvatarSrc(json.data?.key);
      if (nextUrl) {
        setAvatarUrl(nextUrl);
        onUploaded?.(nextUrl);
      }

      pushToast({ kind: "success", title: "Profile photograph updated" });
      router.refresh();
    } catch {
      setError("Network error while uploading your profile photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-3 border-b border-interlink-border pb-4"}>
      {error && <ErrorAlert message={error} />}
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          src={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          size={compact ? "lg" : "xl"}
        />
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-interlink-hairline bg-interlink-surface px-3.5 py-2 text-xs font-medium text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest">
            <Camera className="h-3.5 w-3.5 text-interlink-forest" aria-hidden="true" />
            <span>{uploading ? "Uploading..." : avatarUrl ? "Change Profile Photo" : "Upload Profile Photo"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-interlink-muted">
            JPEG, PNG, or WebP up to 5 MB. Updates across your profile cards immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
