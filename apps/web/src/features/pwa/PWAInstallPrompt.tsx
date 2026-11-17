"use client";

import React, { useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone, Sparkles } from "lucide-react";
import { usePWAInstall } from "./usePWAInstall";

export function PWAInstallPrompt() {
  const { isIOS, canInstall, shouldShowPrompt, promptInstall, dismissPrompt } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <aside
      aria-label="Install Interlink Dashboard"
      className="relative mb-6 overflow-hidden rounded-[4px] border border-interlink-forest/20 bg-gradient-to-r from-emerald-50/80 via-interlink-surface to-interlink-surface p-4 shadow-subtle dark:from-emerald-950/20 dark:via-interlink-surface dark:to-interlink-surface sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Information & Value Proposition */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-interlink-forest text-white shadow-sm">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-interlink-ink sm:text-base">
                Install Interlink Dashboard
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-interlink-forest/10 px-2 py-0.5 text-[11px] font-medium text-interlink-forest">
                <Sparkles className="h-3 w-3" />
                App Experience
              </span>
            </div>
            <p className="mt-1 text-xs text-interlink-muted sm:text-sm">
              Get fast dock and home-screen access, full-screen workspace with no tab clutter, and reliable offline access to your dashboard.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-2.5 self-end sm:self-center">
          <button
            type="button"
            onClick={dismissPrompt}
            className="rounded-[2px] px-3 py-1.5 text-xs font-medium text-interlink-muted transition-colors hover:bg-black/5 hover:text-interlink-ink dark:hover:bg-white/5"
          >
            Not now
          </button>

          {canInstall && (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 rounded-[2px] bg-interlink-forest px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-interlink-forest-hover focus-ring"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          )}

          {isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSInstructions((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-[2px] bg-interlink-forest px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-interlink-forest-hover focus-ring"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{showIOSInstructions ? "Hide Guide" : "Install on iOS"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={dismissPrompt}
            aria-label="Dismiss banner"
            className="rounded-[2px] p-1 text-interlink-muted transition-colors hover:text-interlink-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Instructions Drawer */}
      {isIOS && showIOSInstructions && (
        <div className="mt-4 border-t border-interlink-border/80 pt-3.5 text-xs text-interlink-ink">
          <p className="font-semibold text-interlink-forest">
            Install on your iPhone or iPad:
          </p>
          <ol className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-[2px] border border-interlink-border bg-interlink-surface/60 p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-interlink-forest/10 text-[11px] font-bold text-interlink-forest">
                1
              </span>
              <span className="flex items-center gap-1.5">
                Tap <Share className="h-4 w-4 text-interlink-forest" /> <strong>Share</strong> in Safari.
              </span>
            </li>
            <li className="flex items-center gap-2 rounded-[2px] border border-interlink-border bg-interlink-surface/60 p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-interlink-forest/10 text-[11px] font-bold text-interlink-forest">
                2
              </span>
              <span className="flex items-center gap-1.5">
                Select <PlusSquare className="h-4 w-4 text-interlink-forest" /> <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-center gap-2 rounded-[2px] border border-interlink-border bg-interlink-surface/60 p-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-interlink-forest/10 text-[11px] font-bold text-interlink-forest">
                3
              </span>
              <span className="flex items-center gap-1.5">
                Tap <strong>Add</strong> to launch directly from Home Screen.
              </span>
            </li>
          </ol>
        </div>
      )}
    </aside>
  );
}
