"use client";

import React, { useEffect, useRef } from "react";

interface InteractiveMatteHeroProps {
  children: React.ReactNode;
  className?: string;
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
 */
export function InteractiveMatteHero({
  children,
  className = "",
}: InteractiveMatteHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

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

      // Update node positions & collect active nodes near pointer
      const activeNodes: { node: GridNode; strength: number }[] = [];

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
              // Subtle magnetic pull toward cursor
              const pull = eased * 7;
              node.x += (node.baseX + (dx / dist) * pull - node.x) * 0.18;
              node.y += (node.baseY + (dy / dist) * pull - node.y) * 0.18;
            }
            activeNodes.push({ node, strength: eased });
          } else {
            node.x += (node.baseX - node.x) * 0.12;
            node.y += (node.baseY - node.y) * 0.12;
          }
        } else {
          node.x += (node.baseX - node.x) * 0.12;
          node.y += (node.baseY - node.y) * 0.12;
        }

        // Draw matte dot
        const dotAlpha = (isDark ? 0.14 : 0.11) + strength * (isDark ? 0.55 : 0.5);
        const dotRadius = 1.2 + strength * 1.6;
        ctx.fillStyle = `rgba(${baseColor}, ${dotAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw crisp interactive hairline connections between illuminated nodes
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

      rafId = window.requestAnimationFrame(drawFrame);
    }

    buildGrid();
    rafId = window.requestAnimationFrame(drawFrame);

    const resizeObserver = new ResizeObserver(() => {
      buildGrid();
    });
    resizeObserver.observe(section);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    pointerRef.current = { x, y, active: true };

    if (glowRef.current) {
      glowRef.current.style.opacity = "1";
      glowRef.current.style.background = `radial-gradient(520px circle at ${x}px ${y}px, rgba(40, 84, 56, 0.09), transparent 70%)`;
    }
  }

  function handlePointerLeave() {
    pointerRef.current = { ...pointerRef.current, active: false };
    if (glowRef.current) {
      glowRef.current.style.opacity = "0";
    }
  }

  return (
    <section
      ref={sectionRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative overflow-hidden border-b border-interlink-border bg-interlink-surface py-20 sm:py-24 lg:py-28 ${className}`}
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
        <div className="absolute inset-0 bg-gradient-to-r from-interlink-surface/85 via-interlink-surface/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-interlink-surface/80 via-transparent to-interlink-surface/30" />
      </div>

      {/* Hero Foreground Content */}
      <div className="relative z-10">{children}</div>
    </section>
  );
}
