import React from "react";

interface InterlinkLogoProps {
  variant?: "header" | "card" | "compact";
  className?: string;
}

export function InterlinkMark({
  size = 34,
  darkCard = false,
  className = "",
}: {
  size?: number;
  darkCard?: boolean;
  className?: string;
}) {
  const height = Math.round(size * 1.15);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 64 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {/* Diagonal grey chain link */}
      <g transform="translate(32 37) rotate(-42) translate(-32 -37)">
        <rect
          x="13"
          y="25"
          width="38"
          height="24"
          rx="12"
          stroke={darkCard ? "#A3B1AA" : "#8B95A1"}
          strokeWidth="4.2"
          fill="none"
        />
      </g>
      {/* White/contrast halo behind serif capital I */}
      <path
        d="M23 11H41V16.5C37.5 16.8 36 18 36 22V52C36 56 37.5 57.2 41 57.5V63H23V57.5C26.5 57.2 28 56 28 52V22C28 18 26.5 16.8 23 16.5V11Z"
        fill="#111827"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Crisp black serif I */}
      <path
        d="M23.5 11.5H40.5V16.2C37.2 16.5 35.6 17.8 35.6 21.8V52.2C35.6 56.2 37.2 57.5 40.5 57.8V62.5H23.5V57.8C26.8 57.5 28.4 56.2 28.4 52.2V21.8C28.4 17.8 26.8 16.5 23.5 16.2V11.5Z"
        fill="#0F172A"
      />
    </svg>
  );
}

export function InterlinkLogo({ variant = "header", className = "" }: InterlinkLogoProps) {
  if (variant === "card") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <InterlinkMark
          size={112}
          darkCard
          className="h-24 w-20 sm:h-28 sm:w-24 lg:h-32 lg:w-28"
        />
        <span className="mt-6 font-display text-3xl font-light tracking-[0.22em] text-white sm:text-4xl lg:text-[42px]">
          INTERLINK
        </span>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4 text-sm font-light tracking-wide text-white/95 sm:gap-7 sm:text-base lg:gap-9 lg:text-lg">
          <span>Connection</span>
          <span className="h-5 w-px bg-interlink-gold/80 lg:h-6" aria-hidden="true" />
          <span>Empowerment</span>
          <span className="h-5 w-px bg-interlink-gold/80 lg:h-6" aria-hidden="true" />
          <span>Growth</span>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <InterlinkMark size={variant === "compact" ? 26 : 30} />
      <span className="font-display text-lg font-light tracking-[0.18em] text-interlink-ink sm:text-[19px]">
        INTERLINK
      </span>
    </span>
  );
}
