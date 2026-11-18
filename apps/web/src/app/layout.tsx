import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { BrandPreloader } from "@/components/ui/BrandPreloader";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { ToastProvider } from "@/components/ui/ToastProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  display: "swap",
  variable: "--font-display",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#285438" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1411" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Interlink — Structured Mentorship & Career Development",
    template: "%s | Interlink",
  },
  description:
    "Get Linked with experienced mentors who can guide you as you advance in your career journey. Empowerment. Growth. Connection.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Interlink Dashboard",
  },
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('interlink_theme');
    var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${inter.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-interlink-canvas font-sans text-interlink-ink antialiased"
      >
        <Script id="interlink-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <NavigationProgress />
          <BrandPreloader />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
