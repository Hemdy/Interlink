// Interlink Dashboard Service Worker - v3.0.0
const CACHE_NAME = "interlink-dashboard-v3";
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
    return;
  }

  // 1. API routes: STRICTLY NETWORK-ONLY
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

  // 1b. Never cache Next.js App Router RSC payloads or prefetches
  if (
    url.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    request.headers.get("Next-Router-Prefetch") === "1"
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // 2. HTML Navigation requests (pages): NETWORK-FIRST
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

  // 3. Immutable static Next.js assets, public images, icons: STALE-WHILE-REVALIDATE
  const isStaticAsset =
    !url.searchParams.has("_rsc") &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/images/") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".ico") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js"));

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

// Web Push Notification Handler (works when PWA is backgrounded or closed)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {
    title: "Interlink",
    body: "You have a new update on Interlink.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "interlink-notification",
    url: "/dashboard",
  };

  try {
    const parsed = event.data.json();
    if (parsed && typeof parsed === "object") {
      payload = { ...payload, ...parsed };
    }
  } catch {
    const text = event.data.text();
    if (text) payload.body = text;
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || "interlink-notification",
    renotify: Boolean(payload.tag),
    data: {
      url: payload.url || "/dashboard",
      postId: payload.postId || null,
      commentId: payload.commentId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title || "Interlink", options));
});

// Notification Click Handler: focus existing Interlink tab or open target post/comment URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/dashboard";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            await client.focus();
            if ("navigate" in client) {
              try {
                await client.navigate(targetUrl);
              } catch {
                // Keep focused if navigation is blocked
              }
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
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
          return caches.delete(name);
        })
      ).then(() => {
        return caches
          .open(CACHE_NAME)
          .then((cache) => cache.addAll(PRECACHE_ASSETS));
      });
    });
  }
});
