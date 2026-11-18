"use client";

import React, { useEffect, useRef } from "react";

interface InteractiveMatteHeroProps {
  children: React.ReactNode;
  className?: string;
  paddingClassName?: string;
  surfaceClassName?: string;
  vignetteTone?: "surface" | "canvas";
}

interface GridNode {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

/**
 * Interactive matte hero background section with a subtle architectural dot-lattice
 * that illuminates, gently responds, and connects near the user's pointer.
 * Pauses animation frames cleanly when idle and supports reduced motion and touch devices.
 */
export function InteractiveMatteHero({
  children,
  className = "",
  paddingClassName = "py-20 sm:py-24 lg:py-28",
  surfaceClassName = "overflow-hidden border-b border-interlink-border bg-interlink-surface",
  vignetteTone = "surface",
}: InteractiveMatteHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const startLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: GridNode[] = [];
    let rafId = 0;
    let isRunning = false;

    const SPACING = 36;
    const INTERACTION_RADIUS = 190;

    function buildGrid() {
      if (!section || !canvas || !ctx) return;
      const rect = section.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      nodes = [];
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const offsetX = (width - (cols - 1) * SPACING) / 2;
      const offsetY = (height - (rows - 1) * SPACING) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = offsetX + c * SPACING;
          const y = offsetY + r * SPACING;
          nodes.push({ baseX: x, baseY: y, x, y });
        }
      }
    }

    function drawFrame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      const baseColor = isDark ? "118, 194, 146" : "40, 84, 56";
      const pointer = pointerRef.current;
      const activeNodes: { node: GridNode; strength: number }[] = [];
      let needsAnotherFrame = pointer.active;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        let strength = 0;

        if (pointer.active) {
          const dx = pointer.x - node.baseX;
          const dy = pointer.y - node.baseY;
          const dist = Math.hypot(dx, dy);

          if (dist < INTERACTION_RADIUS) {
            strength = 1 - dist / INTERACTION_RADIUS;
            const eased = strength * strength;
            if (!reducedMotion && dist > 1) {
              const pull = eased * 7;
              node.x += (node.baseX + (dx / dist) * pull - node.x) * 0.18;
              node.y += (node.baseY + (dy / dist) * pull - node.y) * 0.18;
            }
            activeNodes.push({ node, strength: eased });
          } else {
            const dxBase = node.baseX - node.x;
            const dyBase = node.baseY - node.y;
            if (Math.abs(dxBase) > 0.05 || Math.abs(dyBase) > 0.05) {
              node.x += dxBase * 0.12;
              node.y += dyBase * 0.12;
              needsAnotherFrame = true;
            } else {
              node.x = node.baseX;
              node.y = node.baseY;
            }
          }
        } else {
          const dxBase = node.baseX - node.x;
          const dyBase = node.baseY - node.y;
          if (Math.abs(dxBase) > 0.05 || Math.abs(dyBase) > 0.05) {
            node.x += dxBase * 0.12;
            node.y += dyBase * 0.12;
            needsAnotherFrame = true;
          } else {
            node.x = node.baseX;
            node.y = node.baseY;
          }
        }

        const dotAlpha = (isDark ? 0.14 : 0.11) + strength * (isDark ? 0.55 : 0.5);
        const dotRadius = 1.2 + strength * 1.6;
        ctx.fillStyle = `rgba(${baseColor}, ${dotAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (activeNodes.length > 1) {
        const maxLinkDist = SPACING * 1.55;
        ctx.lineWidth = 1;
        for (let i = 0; i < activeNodes.length; i++) {
          const a = activeNodes[i]!;
          for (let j = i + 1; j < activeNodes.length; j++) {
            const b = activeNodes[j]!;
            const dist = Math.hypot(a.node.x - b.node.x, a.node.y - b.node.y);
            if (dist <= maxLinkDist) {
              const linkStrength = Math.min(a.strength, b.strength) * (1 - dist / maxLinkDist);
              const lineAlpha = linkStrength * (isDark ? 0.36 : 0.28);
              if (lineAlpha > 0.01) {
                ctx.strokeStyle = `rgba(${baseColor}, ${lineAlpha.toFixed(3)})`;
                ctx.beginPath();
                ctx.moveTo(a.node.x, a.node.y);
                ctx.lineTo(b.node.x, b.node.y);
                ctx.stroke();
              }
            }
          }
        }
      }

      if (needsAnotherFrame) {
        rafId = window.requestAnimationFrame(drawFrame);
      } else {
        isRunning = false;
      }
    }

    function ensureLoop() {
      if (isRunning) return;
      isRunning = true;
      rafId = window.requestAnimationFrame(drawFrame);
    }

    startLoopRef.current = ensureLoop;

    buildGrid();
    drawFrame();

    const resizeObserver = new ResizeObserver(() => {
      buildGrid();
      drawFrame();
    });
    resizeObserver.observe(section);

    // Repaint resting grid immediately if theme toggles
    const themeObserver = new MutationObserver(() => {
      drawFrame();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      isRunning = false;
      startLoopRef.current = null;
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch") return;
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointerRef.current = { x, y, active: true };
    startLoopRef.current?.();

    if (glowRef.current) {
      const isDark = document.documentElement.classList.contains("dark");
      const glowColor = isDark ? "rgba(118, 194, 146, 0.12)" : "rgba(40, 84, 56, 0.09)";
      glowRef.current.style.opacity = "1";
      glowRef.current.style.background = `radial-gradient(520px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`;
    }
  }

  function handlePointerLeave() {
    pointerRef.current = { ...pointerRef.current, active: false };
    startLoopRef.current?.();
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  }

  const vignetteHorizontal =
    vignetteTone === "canvas"
      ? "from-interlink-canvas/85 via-interlink-canvas/35"
      : "from-interlink-surface/85 via-interlink-surface/35";
  const vignetteVertical =
    vignetteTone === "canvas"
      ? "from-interlink-canvas/80 via-transparent to-interlink-canvas/30"
      : "from-interlink-surface/80 via-transparent to-interlink-surface/30";

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative ${surfaceClassName} ${paddingClassName} ${className}`}
    >
      {/* Interactive Matte Surface Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden"
      >
        {/* Subtle matte texture backdrop */}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)",
            backgroundSize: "12px 12px",
            color: "rgba(40, 84, 56, 0.14)",
          }}
        />

        {/* Cursor-tracking matte spotlight sheen */}
        <div
          ref={glowRef}
          className="absolute inset-0 opacity-0 transition-opacity duration-300"
        />

        {/* Interactive dot-lattice & hairline network canvas */}
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* Soft edge vignette for high text legibility */}
        <div className={`absolute inset-0 bg-gradient-to-r ${vignetteHorizontal} to-transparent`} />
        <div className={`absolute inset-0 bg-gradient-to-t ${vignetteVertical}`} />
      </div>

      {/* Hero Foreground Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
