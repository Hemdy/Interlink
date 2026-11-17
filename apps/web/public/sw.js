// Interlink Dashboard Service Worker - v1.0.0
const CACHE_NAME = "interlink-dashboard-v1";
const OFFLINE_URL = "/offline.html";

// Static assets to precache on installation
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/favicon.ico",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Ignore cross-origin and browser extension requests
  if (url.origin !== self.location.origin) {
    // Optionally allow Pixabay images or external CDN fonts
    return;
  }

  // 1. API routes: STRICTLY NETWORK-ONLY
  // Never cache authenticated API endpoints or mutation routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Network unavailable. Please check your connection.",
              code: "OFFLINE",
            },
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // 2. HTML Navigation requests (pages): NETWORK-FIRST
  // Critical for security: Server-side session validation must run on every request.
  // Never serve cached authenticated HTML from previous sessions.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match(OFFLINE_URL);
        return cachedOffline || Response.error();
      })
    );
    return;
  }

  // 3. Static Next.js assets, public images, icons: STALE-WHILE-REVALIDATE
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Purge cache when user logs out or upon demand
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "PURGE_AUTH_CACHE") {
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          // Keep precache assets, delete any runtime caches
          return caches.delete(name);
        })
      ).then(() => {
        // Re-precache offline page and icons
        return caches
          .open(CACHE_NAME)
          .then((cache) => cache.addAll(PRECACHE_ASSETS));
      });
    });
  }
});
