"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export interface DropdownMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
}

export function DropdownMenu({
  triggerLabel,
  triggerSublabel,
  items,
  align = "right",
}: {
  triggerLabel: string;
  triggerSublabel?: string;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open, updateCoords]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          updateCoords();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center gap-2 rounded-[2px] border border-interlink-border bg-interlink-surface px-3 py-1.5 text-sm font-medium text-interlink-ink shadow-subtle transition-all duration-150 hover:border-interlink-forest focus-ring"
      >
        <span className="max-w-[130px] truncate">{triggerLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-interlink-muted transition-transform duration-200 ${
            open ? "rotate-180 text-interlink-forest" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              ...(align === "right"
                ? { right: `${coords.right}px` }
                : { left: `${coords.left}px` }),
            }}
            className="z-[9999] min-w-[210px] rounded-[2px] border border-interlink-border bg-interlink-surface p-1.5 shadow-modal"
          >
            {triggerSublabel && (
              <div className="mb-1 border-b border-interlink-border/60 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-interlink-muted">
                {triggerSublabel}
              </div>
            )}
            {items.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-[2px] px-2.5 py-2 text-xs font-medium text-interlink-ink transition-colors hover:bg-interlink-app-bg hover:text-interlink-forest"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={`flex w-full items-center gap-2 rounded-[2px] px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                    item.destructive
                      ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      : "text-interlink-ink hover:bg-interlink-app-bg hover:text-interlink-forest"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
