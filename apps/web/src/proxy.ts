import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "interlink_session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/events",
  "/account",
  "/profile",
  "/settings",
  "/messages",
  "/notifications",
  "/mentorships",
  "/requests",
  "/sessions",
  "/goals",
  "/saved",
  "/onboarding",
  "/admin",
];

const PUBLIC_ASSET_PREFIXES = ["/_next/", "/images/", "/favicon.ico", "/icon", "/apple-icon", "/apple-touch-icon", "/offline.html", "/sw.js", "/manifest.webmanifest"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isPublicStaticAsset(pathname: string): boolean {
  return PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublicCacheableEndpoint(pathname: string): boolean {
  if (/^\/api\/v1\/mentors\/[^/]+\/avatar$/.test(pathname)) return true;
  if (pathname === "/api/v1/storage/file") return true;
  return false;
}

function applyNoStoreIsolationHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");

  const existingVary = response.headers.get("Vary");
  if (!existingVary) {
    response.headers.set("Vary", "Cookie");
  } else if (!existingVary.toLowerCase().includes("cookie")) {
    response.headers.set("Vary", `${existingVary}, Cookie`);
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  // Guard protected workspace pages at the edge before SSR executes
  if (isProtectedPath(pathname) && !hasSessionCookie) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = "/sign-in";
    signInUrl.search = "";
    const intendedTarget = `${pathname}${search}`;
    if (intendedTarget && intendedTarget !== "/dashboard") {
      signInUrl.searchParams.set("next", intendedTarget);
    }
    const redirectResponse = NextResponse.redirect(signInUrl);
    applyNoStoreIsolationHeaders(redirectResponse);
    return redirectResponse;
  }

  const response = NextResponse.next();

  // Prevent proxies, CDNs, or browser caches from sharing authenticated pages or API payloads across users
  if (!isPublicCacheableEndpoint(pathname)) {
    applyNoStoreIsolationHeaders(response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html).*)",
  ],
};
