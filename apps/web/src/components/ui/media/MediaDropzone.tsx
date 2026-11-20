"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  CheckCircle2,
  Crop,
  Eye,
  FileText,
  Film,
  Image as ImageIcon,
  RefreshCw,
  Scissors,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ImageCropEditorModal, type CropAspectPreset } from "./ImageCropEditorModal";
import { formatDurationSeconds, VideoTrimCropModal } from "./VideoTrimCropModal";

export type MediaAcceptKind = "image" | "video" | "document" | "image_or_pdf" | "all";
export type UploadPurpose =
  | "avatar"
  | "verification"
  | "resource"
  | "reel"
  | "chat"
  | "post";

export interface UploadedMediaResult {
  key: string;
  url: string;
  signedUrl: string | null;
  contentType: string;
  size: number;
  fileName: string;
  category: "image" | "video" | "document";
  durationLabel?: string;
}

const ACCEPT_MAP: Record<MediaAcceptKind, string> = {
  image: "image/jpeg,image/png,image/webp",
  video: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
  document: "application/pdf,.pdf,.txt,.md,.docx",
  image_or_pdf: "image/jpeg,image/png,image/webp,application/pdf,.pdf",
  all: "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,.pdf,.txt,.md,.docx",
};

const HINT_MAP: Record<MediaAcceptKind, string> = {
  image: "JPEG, PNG, or WebP up to 10 MB",
  video: "MP4, WebM, or MOV up to 25 MB",
  document: "PDF, TXT, MD, or DOCX up to 10 MB",
  image_or_pdf: "PDF, JPEG, PNG, or WebP up to 10 MB",
  all: "Images, Videos (MP4/WebM up to 25 MB), or Documents (PDF/DOCX up to 10 MB)",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectCategory(file: File): "image" | "video" | "document" {
  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext)) return "video";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  return "document";
}

function uploadWithProgress(
  file: File,
  purpose: UploadPurpose,
  mentorshipId: string | null | undefined,
  onProgress: (percent: number) => void,
): Promise<UploadedMediaResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("purpose", purpose);
    if (mentorshipId) {
      form.append("mentorshipId", mentorshipId);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/storage/upload");
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(96, Math.round((event.loaded / event.total) * 100)));
      }
    };

    xhr.onload = () => {
      let json: {
        data?: {
          key: string;
          url?: string;
          signedUrl?: string | null;
          contentType: string;
          size: number;
          fileName?: string;
          category?: "image" | "video" | "document";
        };
        error?: { message?: string };
      } = {};
      try {
        json = JSON.parse(xhr.responseText) as typeof json;
      } catch {
        json = {};
      }

      if (xhr.status >= 200 && xhr.status < 300 && json.data?.key) {
        onProgress(100);
        const category = json.data.category ?? detectCategory(file);
        const resolvedUrl =
          json.data.url ??
          json.data.signedUrl ??
          `/api/v1/storage/file?key=${encodeURIComponent(json.data.key)}`;
        resolve({
          key: json.data.key,
          url: resolvedUrl,
          signedUrl: json.data.signedUrl ?? null,
          contentType: json.data.contentType || file.type,
          size: json.data.size || file.size,
          fileName: json.data.fileName || file.name,
          category,
        });
      } else {
        reject(new Error(json.error?.message ?? `Upload failed (HTTP ${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error while uploading file. Please retry."));
    };

    xhr.send(form);
  });
}

export function MediaDropzone({
  label,
  acceptKind = "all",
  purpose,
  mentorshipId = null,
  cropAspect = "1:1",
  openEditorOnSelect = false,
  compact = false,
  darkSurface = false,
  onUploaded,
  onRemoved,
}: {
  label?: string;
  acceptKind?: MediaAcceptKind;
  purpose: UploadPurpose;
  mentorshipId?: string | null;
  cropAspect?: CropAspectPreset;
  openEditorOnSelect?: boolean;
  compact?: boolean;
  darkSurface?: boolean;
  onUploaded: (result: UploadedMediaResult) => void;
  onRemoved?: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "uploaded" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<UploadedMediaResult | null>(null);
  const [durationLabel, setDurationLabel] = useState<string | undefined>(undefined);

  const [cropOpen, setCropOpen] = useState(false);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const activeCategory = selectedFile ? detectCategory(selectedFile) : uploadedResult?.category ?? null;
  const activePreviewUrl = localPreviewUrl || uploadedResult?.signedUrl || uploadedResult?.url || null;

  function validateClientFile(file: File): string | null {
    const category = detectCategory(file);
    if (acceptKind === "image" && category !== "image") {
      return "Please select a JPEG, PNG, or WebP image.";
    }
    if (acceptKind === "video" && category !== "video") {
      return "Please select an MP4, WebM, or MOV video file.";
    }
    if (acceptKind === "document" && category !== "document") {
      return "Please select a PDF, TXT, MD, or DOCX document.";
    }
    if (acceptKind === "image_or_pdf" && category === "video") {
      return "Please select a PDF document or image file.";
    }
    const maxBytes =
      purpose === "avatar"
        ? 5 * 1024 * 1024
        : category === "video"
          ? 25 * 1024 * 1024
          : 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB upload limit.`;
    }
    return null;
  }

  async function startUpload(file: File, nextDurationLabel?: string) {
    setErrorMsg(null);
    setStatus("uploading");
    setProgress(8);
    try {
      const result = await uploadWithProgress(file, purpose, mentorshipId, setProgress);
      const finalResult: UploadedMediaResult = {
        ...result,
        durationLabel: nextDurationLabel ?? durationLabel,
      };
      setUploadedResult(finalResult);
      setStatus("uploaded");
      onUploaded(finalResult);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function handleIncomingFile(file: File) {
    const validationError = validateClientFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      setStatus("error");
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    setUploadedResult(null);
    setProgress(0);

    const category = detectCategory(file);

    if (category === "video") {
      const probe = document.createElement("video");
      const probeUrl = URL.createObjectURL(file);
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        if (Number.isFinite(probe.duration)) {
          setDurationLabel(formatDurationSeconds(probe.duration));
        }
        URL.revokeObjectURL(probeUrl);
      };
      probe.onerror = () => URL.revokeObjectURL(probeUrl);
      probe.src = probeUrl;
    } else {
      setDurationLabel(undefined);
    }

    if (openEditorOnSelect && category === "image") {
      setStatus("idle");
      setCropOpen(true);
      return;
    }
    if (openEditorOnSelect && category === "video") {
      setStatus("idle");
      setVideoEditorOpen(true);
      return;
    }

    void startUpload(file);
  }

  function handleRemove() {
    setSelectedFile(null);
    setUploadedResult(null);
    setStatus("idle");
    setProgress(0);
    setErrorMsg(null);
    setDurationLabel(undefined);
    onRemoved?.();
  }

  const surfaceTextClass = darkSurface ? "text-white" : "text-interlink-ink";
  const mutedTextClass = darkSurface ? "text-white/60" : "text-interlink-muted";
  const zoneClasses = dragActive
    ? "border-interlink-forest bg-interlink-forest/10"
    : darkSurface
      ? "border-white/20 bg-white/[0.04] hover:border-white/35"
      : "border-interlink-border bg-interlink-app-bg/60 hover:border-interlink-forest/60";

  return (
    <div className="space-y-2.5">
      {label && (
        <label className={`block text-xs font-medium ${surfaceTextClass}`}>{label}</label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_MAP[acceptKind]}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleIncomingFile(file);
        }}
        className="sr-only"
      />

      {!selectedFile ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) handleIncomingFile(dropped);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors focus-ring ${zoneClasses} ${
            compact ? "px-3 py-3.5" : "px-4 py-6"
          }`}
        >
          <div
            className={`flex items-center justify-center rounded-full bg-interlink-forest/15 text-interlink-forest ${
              compact ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            <UploadCloud className={compact ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
          </div>
          <p className={`mt-2 text-xs font-semibold ${surfaceTextClass}`}>
            Drag &amp; drop file here, or{" "}
            <span className="text-interlink-forest underline">browse device</span>
          </p>
          <p className={`mt-1 text-[11px] ${mutedTextClass}`}>{HINT_MAP[acceptKind]}</p>
        </div>
      ) : (
        <div
          className={`rounded-2xl border p-3 ${
            darkSurface
              ? "border-white/15 bg-white/[0.05] text-white"
              : "border-interlink-border bg-interlink-surface text-interlink-ink shadow-subtle"
          }`}
        >
          <div className="flex flex-wrap items-start gap-3">
            {/* Inline Media Thumbnail / Preview */}
            <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black/20">
              {activeCategory === "image" && activePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePreviewUrl}
                  alt={selectedFile.name}
                  className="h-full w-full object-cover"
                />
              ) : activeCategory === "video" && activePreviewUrl ? (
                <video
                  src={activePreviewUrl}
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-interlink-forest/10 text-interlink-forest">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </div>
              )}
              {activeCategory === "video" && durationLabel && (
                <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {durationLabel}
                </span>
              )}
            </div>

            {/* Metadata + Progress + Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate text-xs font-semibold ${surfaceTextClass}`}>
                    {selectedFile.name}
                  </p>
                  <p className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${mutedTextClass}`}>
                    {activeCategory === "image" ? (
                      <ImageIcon className="h-3 w-3" aria-hidden="true" />
                    ) : activeCategory === "video" ? (
                      <Film className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <FileText className="h-3 w-3" aria-hidden="true" />
                    )}
                    <span className="capitalize">{activeCategory}</span>
                    <span>&middot;</span>
                    <span>{formatFileSize(selectedFile.size)}</span>
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    status === "uploaded"
                      ? "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300"
                      : status === "error"
                        ? "bg-red-500/15 text-red-500"
                        : "bg-interlink-forest/15 text-interlink-forest"
                  }`}
                >
                  {status === "uploaded" && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                  {status === "uploading"
                    ? `Uploading ${progress}%`
                    : status === "uploaded"
                      ? "Uploaded"
                      : status === "error"
                        ? "Failed"
                        : "Ready"}
                </span>
              </div>

              {status === "uploading" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-interlink-border/50">
                  <div
                    className="h-full bg-interlink-forest transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* File Management Controls */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {activePreviewUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-interlink-border/80 bg-interlink-app-bg/70 px-2.5 py-1 text-[11px] font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90"
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" /> Preview
                  </button>
                )}

                {activeCategory === "image" && (
                  <button
                    type="button"
                    onClick={() => setCropOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-interlink-border/80 bg-interlink-app-bg/70 px-2.5 py-1 text-[11px] font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90"
                  >
                    <Crop className="h-3 w-3" aria-hidden="true" /> Edit / Crop
                  </button>
                )}

                {activeCategory === "video" && (
                  <button
                    type="button"
                    onClick={() => setVideoEditorOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-interlink-border/80 bg-interlink-app-bg/70 px-2.5 py-1 text-[11px] font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90"
                  >
                    <Scissors className="h-3 w-3" aria-hidden="true" /> Trim &amp; Crop
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-full border border-interlink-border/80 bg-interlink-app-bg/70 px-2.5 py-1 text-[11px] font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest dark:border-white/15 dark:bg-white/[0.08] dark:text-white/90"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" /> Replace
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-300"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" /> Remove
                </button>

                {status === "error" && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void startUpload(selectedFile)}
                    className="h-6 px-2.5 text-[11px]"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMsg && <p className="text-xs font-medium text-red-500">{errorMsg}</p>}

      {/* Image Crop Modal */}
      <ImageCropEditorModal
        open={cropOpen}
        file={selectedFile}
        initialAspect={cropAspect}
        onClose={() => {
          setCropOpen(false);
          if (selectedFile && status === "idle" && !uploadedResult) {
            void startUpload(selectedFile);
          }
        }}
        onSave={(croppedFile) => {
          setCropOpen(false);
          setSelectedFile(croppedFile);
          void startUpload(croppedFile);
        }}
      />

      {/* Video Trim & Crop Modal */}
      <VideoTrimCropModal
        open={videoEditorOpen}
        file={selectedFile}
        onClose={() => {
          setVideoEditorOpen(false);
          if (selectedFile && status === "idle" && !uploadedResult) {
            void startUpload(selectedFile);
          }
        }}
        onSave={({ file: editedVideo, durationLabel: nextDur }) => {
          setVideoEditorOpen(false);
          setSelectedFile(editedVideo);
          setDurationLabel(nextDur);
          void startUpload(editedVideo, nextDur);
        }}
      />

      {/* Interactive Media / Document Preview Modal (No Download Required) */}
      <Modal
        open={previewModalOpen && Boolean(activePreviewUrl)}
        onClose={() => setPreviewModalOpen(false)}
        title={selectedFile?.name ?? "File Preview"}
        maxWidthClass="max-w-2xl"
      >
        <div className="bg-interlink-surface p-5 text-interlink-ink">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="truncate font-display text-base font-semibold">
              {selectedFile?.name ?? "Uploaded File"}
            </h3>
            {selectedFile && (
              <span className="shrink-0 text-xs text-interlink-muted">
                {formatFileSize(selectedFile.size)}
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-interlink-border bg-black/90">
            {activeCategory === "image" && activePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activePreviewUrl}
                alt={selectedFile?.name ?? "Preview"}
                className="mx-auto max-h-[65vh] w-auto object-contain"
              />
            ) : activeCategory === "video" && activePreviewUrl ? (
              <video
                src={activePreviewUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[65vh] w-full"
              />
            ) : activePreviewUrl &&
              (selectedFile?.type === "application/pdf" ||
                selectedFile?.name.toLowerCase().endsWith(".pdf") ||
                selectedFile?.type.startsWith("text/")) ? (
              <iframe
                src={activePreviewUrl}
                title={selectedFile?.name ?? "Document preview"}
                className="h-[65vh] w-full bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center bg-interlink-app-bg p-10 text-center text-interlink-ink">
                <FileText className="h-10 w-10 text-interlink-forest" />
                <p className="mt-3 text-sm font-semibold">{selectedFile?.name}</p>
                <p className="mt-1 text-xs text-interlink-muted">
                  Ready to submit. Inline browser preview supports PDF, images, and videos.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setPreviewModalOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
