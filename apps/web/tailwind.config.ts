import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        interlink: {
          forest: "rgb(var(--il-forest) / <alpha-value>)",
          "forest-card": "rgb(var(--il-forest-card) / <alpha-value>)",
          "forest-deep": "rgb(var(--il-forest-deep) / <alpha-value>)",
          "forest-hover": "rgb(var(--il-forest-hover) / <alpha-value>)",
          sage: "rgb(var(--il-sage) / <alpha-value>)",
          gold: "rgb(var(--il-gold) / <alpha-value>)",
          canvas: "rgb(var(--il-canvas) / <alpha-value>)",
          "app-bg": "rgb(var(--il-app-bg) / <alpha-value>)",
          surface: "rgb(var(--il-surface) / <alpha-value>)",
          modal: "rgb(var(--il-modal) / <alpha-value>)",
          ink: "rgb(var(--il-ink) / <alpha-value>)",
          muted: "rgb(var(--il-muted) / <alpha-value>)",
          link: "rgb(var(--il-link) / <alpha-value>)",
          border: "rgb(var(--il-border) / <alpha-value>)",
          hairline: "rgb(var(--il-hairline) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 12px 32px rgba(15, 23, 42, 0.12)",
        elevated: "0 6px 20px rgba(15, 23, 42, 0.08)",
        modal: "0 20px 50px rgba(15, 23, 42, 0.25)",
        subtle: "0 1px 3px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
