import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Interlink Dashboard — Mentorship & Career Workspace",
    short_name: "Interlink",
    description:
      "Access your active mentorships, scheduled sessions, goals, and direct messages in a dedicated workspace.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#285438",
    theme_color: "#285438",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    categories: ["productivity", "education", "business"],
  };
}
