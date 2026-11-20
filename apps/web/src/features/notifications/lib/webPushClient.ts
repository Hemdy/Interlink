"use client";

export function isWebPushBrowserSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isTouchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /(iphone|ipad|ipod)/.test(ua) || isTouchMac;
}

export function isStandalonePwaDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    Boolean(nav.standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function detectClientPlatform(): "android" | "ios" | "desktop" | "other" {
  if (typeof window === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (isIosDevice()) return "ios";
  if (/(windows|macintosh|linux|cros)/.test(ua)) return "desktop";
  return "other";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushBrowserSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeCurrentDeviceToPush(
  vapidPublicKey: string,
): Promise<PushSubscription> {
  if (!isWebPushBrowserSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notification permission is blocked in browser settings."
        : "Notification permission was not granted.",
    );
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  const endpoint = subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Browser returned an incomplete push subscription.");
  }

  const res = await fetch("/api/v1/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      keys: { p256dh, auth },
      platform: detectClientPlatform(),
    }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(data.error?.message || "Could not save push subscription.");
  }

  return subscription;
}

export async function unsubscribeCurrentDeviceFromPush(): Promise<void> {
  const existing = await getActivePushSubscription();
  if (!existing) return;

  await fetch("/api/v1/notifications/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: existing.endpoint }),
  }).catch(() => undefined);

  await existing.unsubscribe().catch(() => undefined);
}
