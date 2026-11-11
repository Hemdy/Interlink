"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  maxWidthClass = "max-w-3xl",
  children,
  hideCloseButton = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-interlink-sage/85 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Dialog"}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${maxWidthClass} max-h-[92vh] overflow-y-auto border border-interlink-border/60 shadow-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-3 top-3 z-10 rounded-[2px] p-1.5 text-interlink-muted transition-colors hover:bg-black/10 hover:text-interlink-ink dark:hover:bg-white/10 focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
