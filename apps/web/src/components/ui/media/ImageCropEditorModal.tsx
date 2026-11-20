"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, RotateCw, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export type CropAspectPreset = "1:1" | "16:9" | "4:5" | "free";

const ASPECT_RATIO_VALUES: Record<CropAspectPreset, number | null> = {
  "1:1": 1,
  "16:9": 16 / 9,
  "4:5": 4 / 5,
  free: 4 / 3,
};

export function ImageCropEditorModal({
  open,
  file,
  initialAspect = "1:1",
  onClose,
  onSave,
}: {
  open: boolean;
  file: File | null;
  initialAspect?: CropAspectPreset;
  onClose: () => void;
  onSave: (croppedFile: File) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [aspect, setAspect] = useState<CropAspectPreset>(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(
    null,
  );
  const frameRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setAspect(initialAspect);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, [initialAspect, file]);

  useEffect(() => {
    if (!file || !open) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, open]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: offset.x,
      startY: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setOffset({
      x: Math.max(-220, Math.min(220, dragStartRef.current.startX + dx)),
      y: Math.max(-220, Math.min(220, dragStartRef.current.startY + dy)),
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (dragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
      setDragging(false);
      dragStartRef.current = null;
    }
  }

  async function handleExport() {
    if (!file || !imgRef.current || !frameRef.current || !naturalSize) return;
    setProcessing(true);
    try {
      const frameRect = frameRef.current.getBoundingClientRect();
      const targetAspect = ASPECT_RATIO_VALUES[aspect] ?? frameRect.width / frameRect.height;

      const exportWidth = targetAspect >= 1 ? 1024 : Math.round(1024 * targetAspect);
      const exportHeight = Math.round(exportWidth / targetAspect);

      const canvas = document.createElement("canvas");
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scaleToExport = exportWidth / frameRect.width;
      const baseCoverScale = Math.max(
        frameRect.width / naturalSize.w,
        frameRect.height / naturalSize.h,
      );

      ctx.save();
      ctx.translate(exportWidth / 2 + offset.x * scaleToExport, exportHeight / 2 + offset.y * scaleToExport);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = naturalSize.w * baseCoverScale * zoom * scaleToExport;
      const drawH = naturalSize.h * baseCoverScale * zoom * scaleToExport;
      ctx.drawImage(imgRef.current, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.9),
      );

      if (!blob) return;
      const nextName = file.name.replace(/\.[^.]+$/, "") + "-edited.webp";
      onSave(new File([blob], nextName, { type: "image/webp" }));
    } finally {
      setProcessing(false);
    }
  }

  const ratioStyle =
    aspect === "1:1"
      ? "aspect-square max-w-[280px]"
      : aspect === "16:9"
        ? "aspect-video max-w-[360px]"
        : aspect === "4:5"
          ? "aspect-[4/5] max-w-[260px]"
          : "aspect-[4/3] max-w-[340px]";

  return (
    <Modal open={open && Boolean(file)} onClose={onClose} title="Edit & Crop Image" maxWidthClass="max-w-lg">
      <div className="bg-interlink-surface p-5 text-interlink-ink sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-interlink-ink">
              Crop &amp; Reposition Image
            </h3>
            <p className="text-xs text-interlink-muted">
              Drag to reposition, adjust zoom, rotate, and choose crop framing.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-app-bg p-1 text-[11px] font-semibold">
            {(["1:1", "4:5", "16:9", "free"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAspect(preset)}
                className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
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

        {/* Interactive Crop Canvas Viewport */}
        <div className="mt-4 flex justify-center rounded-2xl bg-[#0e1411] p-4">
          <div
            ref={frameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`relative w-full ${ratioStyle} cursor-grab touch-none overflow-hidden rounded-2xl ring-2 ring-white/40 active:cursor-grabbing`}
          >
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                draggable={false}
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setNaturalSize({ w: target.naturalWidth, h: target.naturalHeight });
                }}
                className="pointer-events-none h-full w-full select-none object-cover"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />
            )}

            {/* Rule-of-thirds overlay guides */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
            >
              {Array.from({ length: 9 }).map((_, idx) => (
                <div key={idx} className="border border-white/15" />
              ))}
            </div>
          </div>
        </div>

        {/* Zoom & Rotate Controls */}
        <div className="mt-4 space-y-3 rounded-2xl border border-interlink-border bg-interlink-app-bg/60 p-3.5">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-interlink-forest" aria-hidden="true" />
            <span className="w-12 text-xs font-medium text-interlink-muted">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
              aria-label="Image zoom"
              className="h-1.5 flex-1 cursor-pointer accent-interlink-forest"
            />
            <span className="w-10 text-right text-xs font-semibold tabular-nums">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Rotate -90&deg;
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="h-3.5 w-3.5" /> Rotate +90&deg;
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setOffset({ x: 0, y: 0 });
              }}
              className="text-xs font-medium text-interlink-muted hover:text-interlink-forest"
            >
              Reset framing
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" loading={processing} onClick={handleExport}>
            Apply Crop
          </Button>
        </div>
      </div>
    </Modal>
  );
}
