"use client";

import React, { useEffect, useRef, useState } from "react";
import { Crop, Play, Scissors, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export type VideoAspectPreset = "original" | "16:9" | "9:16" | "1:1";

export function formatDurationSeconds(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function VideoTrimCropModal({
  open,
  file,
  onClose,
  onSave,
}: {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSave: (result: { file: File; durationLabel: string }) => void;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [aspect, setAspect] = useState<VideoAspectPreset>("original");
  const [focalX, setFocalX] = useState(50);
  const [focalY, setFocalY] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const supportsCapture =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined";

  useEffect(() => {
    if (!file || !open) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setDuration(0);
    setAspect("original");
    setFocalX(50);
    setFocalY(50);
    setPlaying(false);
    setExportProgress(0);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, open]);

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    setDuration(v.duration);
    setTrimStart(0);
    setTrimEnd(v.duration);
  }

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    if (trimEnd > 0 && v.currentTime >= trimEnd) {
      v.currentTime = trimStart;
      if (!playing) v.pause();
    }
  }

  function togglePlayPreview() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < trimStart || v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
      }
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  async function handleApplyEdit() {
    if (!file) return;
    const clipDuration = Math.max(1, trimEnd - trimStart);
    const label = formatDurationSeconds(clipDuration);

    const needsProcessing =
      supportsCapture &&
      videoRef.current &&
      duration > 0 &&
      (trimStart > 0.15 || trimEnd < duration - 0.15 || aspect !== "original");

    if (!needsProcessing) {
      onSave({ file, durationLabel: label });
      return;
    }

    const v = videoRef.current!;
    setExporting(true);
    setExportProgress(5);
    try {
      const srcW = v.videoWidth || 1280;
      const srcH = v.videoHeight || 720;

      let outW = srcW;
      let outH = srcH;
      if (aspect === "16:9") {
        outW = Math.min(960, srcW);
        outH = Math.round((outW * 9) / 16);
      } else if (aspect === "9:16") {
        outH = Math.min(960, srcH);
        outW = Math.round((outH * 9) / 16);
      } else if (aspect === "1:1") {
        const size = Math.min(720, srcW, srcH);
        outW = size;
        outH = size;
      }

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx || typeof canvas.captureStream !== "function") {
        onSave({ file, durationLabel: label });
        return;
      }

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      const scale = Math.max(outW / srcW, outH / srcH);
      const drawW = srcW * scale;
      const drawH = srcH * scale;
      const offsetX = -((drawW - outW) * (focalX / 100));
      const offsetY = -((drawH - outH) * (focalY / 100));

      v.pause();
      v.currentTime = trimStart;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          v.removeEventListener("seeked", onSeeked);
          resolve();
        };
        v.addEventListener("seeked", onSeeked);
      });

      const recordedBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
        recorder.start(200);
        void v.play();

        const renderFrame = () => {
          if (v.currentTime >= trimEnd || v.ended) {
            v.pause();
            if (recorder.state !== "inactive") recorder.stop();
            setExportProgress(100);
            return;
          }
          ctx.drawImage(v, offsetX, offsetY, drawW, drawH);
          const pct = Math.min(
            98,
            Math.round(((v.currentTime - trimStart) / clipDuration) * 100),
          );
          setExportProgress(Math.max(5, pct));
          requestAnimationFrame(renderFrame);
        };
        requestAnimationFrame(renderFrame);
      });

      const nextName = file.name.replace(/\.[^.]+$/, "") + "-trimmed.webm";
      const editedFile = new File([recordedBlob], nextName, { type: "video/webm" });
      onSave({ file: editedFile, durationLabel: label });
    } catch {
      onSave({ file, durationLabel: label });
    } finally {
      setExporting(false);
    }
  }

  const aspectBoxClass =
    aspect === "16:9"
      ? "aspect-video max-w-[380px]"
      : aspect === "9:16"
        ? "aspect-[9/16] max-w-[200px]"
        : aspect === "1:1"
          ? "aspect-square max-w-[260px]"
          : "aspect-video max-w-[380px]";

  return (
    <Modal open={open && Boolean(file)} onClose={onClose} title="Preview, Trim & Crop Video" maxWidthClass="max-w-xl">
      <div className="bg-interlink-surface p-5 text-interlink-ink sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-interlink-ink">
              Trim &amp; Crop Video
            </h3>
            <p className="text-xs text-interlink-muted">
              Set start/end trim points and frame aspect before uploading.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-app-bg p-1 text-[11px] font-semibold">
            {(["original", "16:9", "9:16", "1:1"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAspect(preset)}
                className={`rounded-full px-2.5 py-1 capitalize transition-colors ${
                  aspect === preset
                    ? "bg-interlink-forest text-white"
                    : "text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Cropped Video Preview */}
        <div className="mt-4 flex justify-center rounded-2xl bg-black p-3">
          <div className={`relative w-full ${aspectBoxClass} overflow-hidden rounded-xl bg-black`}>
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setPlaying(false)}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${focalX}% ${focalY}%` }}
              />
            )}
          </div>
        </div>

        {/* Trim & Focal Controls */}
        <div className="mt-4 space-y-3 rounded-2xl border border-interlink-border bg-interlink-app-bg/60 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={togglePlayPreview}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-full bg-interlink-forest px-3.5 py-1.5 font-semibold text-white hover:bg-interlink-forest-hover"
            >
              {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              <span>{playing ? "Pause Preview" : "Play Trimmed Clip"}</span>
            </button>
            <span className="font-semibold tabular-nums text-interlink-ink">
              Clip Length: {formatDurationSeconds(Math.max(0, trimEnd - trimStart))}
            </span>
          </div>

          {duration > 0 && (
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex justify-between text-[11px] text-interlink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Scissors className="h-3 w-3 text-interlink-forest" /> Start Time
                  </span>
                  <span className="font-semibold text-interlink-ink">
                    {formatDurationSeconds(trimStart)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, trimEnd - 0.5)}
                  step={0.1}
                  value={trimStart}
                  disabled={exporting}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    setTrimStart(next);
                    if (videoRef.current) videoRef.current.currentTime = next;
                  }}
                  aria-label="Video start time"
                  className="h-1.5 w-full cursor-pointer accent-interlink-forest"
                />
              </div>

              <div>
                <div className="mb-1 flex justify-between text-[11px] text-interlink-muted">
                  <span className="inline-flex items-center gap-1">
                    <Scissors className="h-3 w-3 text-interlink-forest" /> End Time
                  </span>
                  <span className="font-semibold text-interlink-ink">
                    {formatDurationSeconds(trimEnd)}
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.min(duration, trimStart + 0.5)}
                  max={duration}
                  step={0.1}
                  value={trimEnd}
                  disabled={exporting}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    setTrimEnd(next);
                    if (videoRef.current) videoRef.current.currentTime = Math.max(trimStart, next - 0.5);
                  }}
                  aria-label="Video end time"
                  className="h-1.5 w-full cursor-pointer accent-interlink-forest"
                />
              </div>
            </div>
          )}

          {aspect !== "original" && (
            <div className="grid grid-cols-1 gap-3 border-t border-interlink-border/60 pt-2.5 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Crop className="h-3.5 w-3.5 text-interlink-forest" />
                <span className="text-[11px] text-interlink-muted">Pan X</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalX}
                  disabled={exporting}
                  onChange={(e) => setFocalX(Number.parseInt(e.target.value, 10))}
                  aria-label="Horizontal crop position"
                  className="h-1.5 flex-1 cursor-pointer accent-interlink-forest"
                />
              </div>
              <div className="flex items-center gap-2">
                <Crop className="h-3.5 w-3.5 text-interlink-forest" />
                <span className="text-[11px] text-interlink-muted">Pan Y</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focalY}
                  disabled={exporting}
                  onChange={(e) => setFocalY(Number.parseInt(e.target.value, 10))}
                  aria-label="Vertical crop position"
                  className="h-1.5 flex-1 cursor-pointer accent-interlink-forest"
                />
              </div>
            </div>
          )}

          {exporting && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] font-semibold text-interlink-forest">
                <span>Rendering trimmed video clip...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-interlink-border/50">
                <div
                  className="h-full bg-interlink-forest transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={exporting || !file}
            onClick={() => {
              if (file) {
                onSave({ file, durationLabel: formatDurationSeconds(duration || 30) });
              }
            }}
            className="text-xs font-medium text-interlink-muted hover:text-interlink-ink"
          >
            Use Original Unedited Clip
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={exporting}>
              Cancel
            </Button>
            <Button type="button" loading={exporting} onClick={handleApplyEdit}>
              Apply Trim &amp; Crop
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
