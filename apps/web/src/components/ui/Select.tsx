"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  children?: React.ReactNode;
}

function extractOptions(children: React.ReactNode): SelectOption[] {
  const result: SelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "option") {
      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      const label =
        typeof props.children === "string" || typeof props.children === "number"
          ? String(props.children)
          : Array.isArray(props.children)
            ? props.children.map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : "")).join("")
            : String(props.value ?? "");
      result.push({
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: Boolean(props.disabled),
      });
    }
  });
  return result;
}

export function Select({
  label,
  error,
  hint,
  id,
  name,
  value,
  defaultValue,
  onChange,
  onValueChange,
  options: propOptions,
  placeholder = "Select an option",
  disabled = false,
  required = false,
  size = "md",
  className = "",
  "aria-label": ariaLabel,
  children,
}: SelectProps) {
  const generatedId = useId();
  const controlId = id ?? name ?? generatedId;
  const listboxId = `${controlId}-listbox`;

  const options = useMemo(
    () => propOptions ?? extractOptions(children),
    [propOptions, children],
  );

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const currentValue = isControlled ? value : internalValue;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openAbove: boolean;
  }>({ top: 0, left: 0, width: 200, openAbove: false });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.value === currentValue);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = Math.min(260, options.length * 38 + 12);
    const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setCoords({
      top: openAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 170),
      openAbove,
    });
  }, [options.length]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    updatePosition();
    const currentIdx = Math.max(
      0,
      options.findIndex((opt) => opt.value === currentValue && !opt.disabled),
    );
    setHighlightedIndex(currentIdx);
    setOpen(true);
  }, [currentValue, disabled, options, updatePosition]);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const commitValue = useCallback(
    (nextValue: string) => {
      if (!isControlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
      onChange?.({ target: { value: nextValue, name } });
      closeMenu();
      triggerRef.current?.focus();
    },
    [closeMenu, isControlled, name, onChange, onValueChange],
  );

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    }

    function handleWindowChange() {
      updatePosition();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [closeMenu, open, updatePosition]);

  function moveHighlight(step: 1 | -1) {
    if (options.length === 0) return;
    let next = highlightedIndex;
    for (let i = 0; i < options.length; i += 1) {
      next = (next + step + options.length) % options.length;
      if (!options[next]?.disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Tab") {
      closeMenu();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHighlightedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHighlightedIndex(Math.max(0, options.length - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = options[highlightedIndex];
      if (target && !target.disabled) {
        commitValue(target.value);
      }
    }
  }

  const sizeClasses =
    size === "sm" ? "px-3 py-1.5 text-xs min-h-[34px]" : "px-3.5 py-2.5 text-sm min-h-[42px]";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={controlId}
          className="mb-1.5 block text-xs font-medium text-interlink-ink"
        >
          {label}
          {required && <span className="ml-0.5 text-red-600 dark:text-red-400">*</span>}
        </label>
      )}

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? label}
        aria-invalid={error ? "true" : undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-[2px] border bg-interlink-surface text-left text-interlink-ink shadow-subtle transition-all duration-150 focus:border-interlink-forest focus:outline-none focus:ring-1 focus:ring-interlink-forest disabled:cursor-not-allowed disabled:opacity-60 ${
          error ? "border-red-500" : open ? "border-interlink-forest ring-1 ring-interlink-forest" : "border-interlink-border hover:border-interlink-hairline"
        } ${sizeClasses}`}
      >
        <span className={`truncate ${selectedOption ? "text-interlink-ink" : "text-interlink-muted"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-interlink-muted transition-transform duration-200 ${
            open ? "rotate-180 text-interlink-forest" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? label ?? "Options"}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              ...(coords.openAbove
                ? { bottom: `${window.innerHeight - coords.top}px` }
                : { top: `${coords.top}px` }),
            }}
            className="z-[9999] max-h-64 overflow-y-auto rounded-[2px] border border-interlink-border bg-interlink-surface p-1 shadow-modal"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === currentValue;
              const isHighlighted = idx === highlightedIndex;
              return (
                <button
                  key={`${opt.value}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onClick={() => !opt.disabled && commitValue(opt.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[2px] px-3 py-2 text-left transition-colors ${
                    size === "sm" ? "text-xs" : "text-sm"
                  } ${
                    opt.disabled
                      ? "cursor-not-allowed opacity-45"
                      : isSelected
                        ? "bg-interlink-forest/10 font-medium text-interlink-forest"
                        : isHighlighted
                          ? "bg-interlink-app-bg text-interlink-ink"
                          : "text-interlink-ink hover:bg-interlink-app-bg"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-interlink-forest" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body,
        )}

      {hint && !error && <p className="mt-1 text-xs text-interlink-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
