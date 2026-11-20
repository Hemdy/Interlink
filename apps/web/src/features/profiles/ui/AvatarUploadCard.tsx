"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaDropzone } from "@/components/ui/media/MediaDropzone";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveAvatarSrc, UserAvatar } from "@/components/ui/UserAvatar";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    resolveAvatarSrc(initialProfileImage),
  );

  useEffect(() => {
    setAvatarUrl(resolveAvatarSrc(initialProfileImage));
  }, [initialProfileImage]);

  return (
    <div className={compact ? "space-y-3" : "space-y-3 border-b border-interlink-border pb-4"}>
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar
          src={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          size={compact ? "lg" : "xl"}
          previewable
          previewSubtitle="Profile photograph"
        />
        <div className="min-w-[230px] flex-1">
          <MediaDropzone
            acceptKind="image"
            purpose="avatar"
            cropAspect="1:1"
            openEditorOnSelect
            compact
            onUploaded={(result) => {
              const nextUrl = result.signedUrl ?? resolveAvatarSrc(result.key);
              if (nextUrl) {
                setAvatarUrl(nextUrl);
                onUploaded?.(nextUrl);
              }
              pushToast({ kind: "success", title: "Profile photograph updated" });
              router.refresh();
            }}
            onRemoved={() => {
              setAvatarUrl(resolveAvatarSrc(initialProfileImage));
            }}
          />
        </div>
      </div>
    </div>
  );
}
