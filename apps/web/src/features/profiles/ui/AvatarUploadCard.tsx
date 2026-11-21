"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MediaDropzone } from "@/components/ui/media/MediaDropzone";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveAvatarSrc, UserAvatar } from "@/components/ui/UserAvatar";

export function AvatarUploadCard({
  firstName,
  lastName,
  initialProfileImage,
  onUploaded,
  onRemoved,
  besideSlot,
  compact = false,
}: {
  firstName: string;
  lastName: string;
  initialProfileImage?: string | null;
  onUploaded?: (newUrl: string) => void;
  onRemoved?: () => void;
  besideSlot?: React.ReactNode;
  compact?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    resolveAvatarSrc(initialProfileImage),
  );
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dropzoneKey, setDropzoneKey] = useState(0);

  useEffect(() => {
    setAvatarUrl(resolveAvatarSrc(initialProfileImage));
  }, [initialProfileImage]);

  async function handleRemovePhoto() {
    setRemoving(true);
    try {
      const res = await fetch("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileImage: null }),
      });
      if (!res.ok) {
        pushToast({ kind: "error", title: "Unable to remove profile photograph" });
        return;
      }
      setAvatarUrl(null);
      setManageModalOpen(false);
      onRemoved?.();
      pushToast({ kind: "info", title: "Profile photograph removed" });
      router.refresh();
    } catch {
      pushToast({ kind: "error", title: "Network error removing photograph" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-4 pb-2"}>
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => {
              setDropzoneKey((k) => k + 1);
              setManageModalOpen(true);
            }}
            aria-label="Change or remove profile photograph"
            title="Click to change or remove profile photograph"
            className="group relative shrink-0 rounded-full focus-ring"
          >
            <UserAvatar
              src={avatarUrl}
              firstName={firstName}
              lastName={lastName}
              size={compact ? "lg" : "xl"}
            />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-interlink-forest text-white shadow-sm">
              <Camera className="h-3 w-3" aria-hidden="true" />
            </span>
          </button>
        ) : (
          <UserAvatar
            src={null}
            firstName={firstName}
            lastName={lastName}
            size={compact ? "lg" : "xl"}
          />
        )}

        {besideSlot && <div className="min-w-[180px] flex-1">{besideSlot}</div>}
      </div>

      {/* Show inline upload dropzone only when the user does not have a profile image yet */}
      {!avatarUrl && (
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
            setAvatarUrl(null);
            onRemoved?.();
          }}
        />
      )}

      {/* Manage Existing Profile Photograph Modal */}
      <Modal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title="Manage Profile Photograph"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 rounded-2xl bg-interlink-app-bg p-3.5">
            <UserAvatar
              src={avatarUrl}
              firstName={firstName}
              lastName={lastName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-interlink-ink">
                Current Display Picture
              </p>
              <p className="text-xs text-interlink-muted">
                Upload a new cropped image or remove your current photograph.
              </p>
            </div>
          </div>

          <MediaDropzone
            key={dropzoneKey}
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
              setManageModalOpen(false);
              pushToast({ kind: "success", title: "Profile photograph updated" });
              router.refresh();
            }}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={removing}
              onClick={() => void handleRemovePhoto()}
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove Photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setManageModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
