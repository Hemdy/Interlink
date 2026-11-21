"use client";

import React, { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@interlink/utils";
import type { NotificationType } from "@interlink/types";
import {
  Bell,
  BellRing,
  Laptop,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";

function ToggleSwitch({
  checked,
  disabled = false,
  label,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-interlink-forest" : "bg-interlink-border"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getActivePushSubscription,
  isIosDevice,
  isStandalonePwaDisplay,
  isWebPushBrowserSupported,
  subscribeCurrentDeviceToPush,
  unsubscribeCurrentDeviceFromPush,
} from "@/features/notifications/lib/webPushClient";

interface DeviceSubscription {
  id: string;
  endpoint: string;
  deviceLabel: string | null;
  platform: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface PrefRow {
  notificationType: NotificationType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

const PREF_CONFIG: Array<{
  type: NotificationType;
  label: string;
  description: string;
}> = [
  {
    type: "post_liked",
    label: "Post Likes",
    description: "Get notified when someone likes a post you published.",
  },
  {
    type: "post_commented",
    label: "Post Comments",
    description: "Get notified when someone comments on your post.",
  },
  {
    type: "new_post",
    label: "New Community Posts",
    description: "Receive alerts when new posts, resources, or opportunities go live.",
  },
  {
    type: "new_message",
    label: "Direct Messages",
    description: "New messages from your mentors or mentees.",
  },
  {
    type: "request_received",
    label: "Mentorship Requests",
    description: "Incoming mentorship applications and request updates.",
  },
  {
    type: "session_scheduled",
    label: "Sessions & Reminders",
    description: "Newly proposed, confirmed, or updated sessions.",
  },
  {
    type: "mentor_feedback",
    label: "Goal & Progress Feedback",
    description: "Feedback posted on your goals and milestones.",
  },
];

export function PushNotificationsManager({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { pushToast } = useToast();

  const [supported, setSupported] = useState(true);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [serverConfigured, setServerConfigured] = useState(true);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [prefsMap, setPrefsMap] = useState<Record<string, PrefRow>>({});
  const [loading, setLoading] = useState(true);
  const [togglingPush, setTogglingPush] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [savingPrefType, setSavingPrefType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPushState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const browserSupported = isWebPushBrowserSupported();
      const needsInstall = isIosDevice() && !isStandalonePwaDisplay();
      setSupported(browserSupported);
      setIosNeedsInstall(needsInstall);

      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission);
      }

      const [subRes, prefRes, activeSub] = await Promise.all([
        fetch("/api/v1/notifications/push/subscribe", { cache: "no-store" }),
        fetch("/api/v1/notifications/preferences", { cache: "no-store" }),
        getActivePushSubscription(),
      ]);

      setCurrentEndpoint(activeSub?.endpoint ?? null);

      if (subRes.ok) {
        const subJson = (await subRes.json()) as {
          data?: {
            configured: boolean;
            vapidPublicKey: string | null;
            subscriptions: DeviceSubscription[];
          };
        };
        if (subJson.data) {
          setServerConfigured(subJson.data.configured);
          setVapidPublicKey(subJson.data.vapidPublicKey);
          setDevices(subJson.data.subscriptions);
        }
      }

      if (prefRes.ok) {
        const prefJson = (await prefRes.json()) as {
          data?: { preferences: PrefRow[] };
        };
        const map: Record<string, PrefRow> = {};
        for (const row of prefJson.data?.preferences ?? []) {
          map[row.notificationType] = row;
        }
        setPrefsMap(map);
      }
    } catch {
      setError("Unable to load push notification settings right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPushState();
  }, [loadPushState]);

  const thisDeviceSubscribed = Boolean(
    currentEndpoint && devices.some((d) => d.endpoint === currentEndpoint),
  );

  async function handleEnablePush() {
    setError(null);
    if (!vapidPublicKey || !serverConfigured) {
      setError("Server Web Push keys are not configured.");
      return;
    }

    setTogglingPush(true);
    try {
      const sub = await subscribeCurrentDeviceToPush(vapidPublicKey);
      setPermission(Notification.permission);
      setCurrentEndpoint(sub.endpoint);
      await loadPushState();
      pushToast({
        kind: "success",
        title: "Push notifications enabled",
        description: "This device will now receive real-time alerts even in the background.",
      });
    } catch (err) {
      setPermission(
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : permission,
      );
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleDisableThisDevice() {
    setError(null);
    setTogglingPush(true);
    try {
      await unsubscribeCurrentDeviceFromPush();
      setCurrentEndpoint(null);
      await loadPushState();
      pushToast({
        kind: "info",
        title: "Push notifications disabled for this device",
      });
    } catch {
      setError("Could not unsubscribe this device.");
    } finally {
      setTogglingPush(false);
    }
  }

  async function handleRemoveDevice(id: string, endpoint: string) {
    const previous = devices;
    setDevices((prev) => prev.filter((d) => d.id !== id));
    try {
      const res = await fetch("/api/v1/notifications/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      if (!res.ok) throw new Error("Failed");
      if (endpoint === currentEndpoint) {
        const sub = await getActivePushSubscription();
        if (sub) await sub.unsubscribe().catch(() => undefined);
        setCurrentEndpoint(null);
      }
      pushToast({ kind: "info", title: "Device removed" });
    } catch {
      setDevices(previous);
      pushToast({ kind: "error", title: "Could not remove device" });
    }
  }

  async function handleSendTestPush() {
    setError(null);
    setTestingPush(true);
    try {
      const res = await fetch("/api/v1/notifications/push/test", {
        method: "POST",
      });
      const json = (await res.json()) as {
        data?: { sent: number };
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "Failed to send test push notification.");
        return;
      }
      pushToast({
        kind: "success",
        title: "Test push sent",
        description: `Delivered to ${json.data?.sent ?? 1} active device(s).`,
      });
    } catch {
      setError("Network error while sending test push.");
    } finally {
      setTestingPush(false);
    }
  }

  async function togglePref(type: NotificationType) {
    const current = prefsMap[type] ?? {
      notificationType: type,
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
    };
    const nextEnabled = !(current.inAppEnabled || current.pushEnabled);
    const nextRow: PrefRow = {
      ...current,
      inAppEnabled: nextEnabled,
      emailEnabled: nextEnabled,
      pushEnabled: nextEnabled,
    };

    setPrefsMap((prev) => ({ ...prev, [type]: nextRow }));
    setSavingPrefType(type);

    try {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: [nextRow] }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setPrefsMap((prev) => ({ ...prev, [type]: current }));
      pushToast({ kind: "error", title: "Could not save notification preference" });
    } finally {
      setSavingPrefType(null);
    }
  }

  return (
    <Card className={compact ? "space-y-4 p-4 sm:p-5" : "space-y-5"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-interlink-forest/12 text-interlink-forest">
            {thisDeviceSubscribed ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Push Notifications
              </h2>
              {thisDeviceSubscribed ? (
                <Badge tone="success">Active on This Device</Badge>
              ) : permission === "denied" ? (
                <Badge tone="danger">Blocked in Browser</Badge>
              ) : (
                <Badge tone="neutral">Off on This Device</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-interlink-muted">
              Receive real-time alerts on desktop, Android, and installed iOS PWAs when someone
              likes or comments on your post or shares new community updates.
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex flex-wrap items-center gap-3">
            {thisDeviceSubscribed && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSendTestPush}
                loading={testingPush}
              >
                <Send className="h-3.5 w-3.5" /> Test Push
              </Button>
            )}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-interlink-muted">
                {thisDeviceSubscribed ? "On" : "Off"}
              </span>
              <ToggleSwitch
                checked={thisDeviceSubscribed}
                disabled={
                  togglingPush ||
                  (!thisDeviceSubscribed &&
                    (!supported ||
                      iosNeedsInstall ||
                      !serverConfigured ||
                      permission === "denied"))
                }
                label="Toggle Web Push notifications on this device"
                onToggle={() => {
                  if (thisDeviceSubscribed) {
                    void handleDisableThisDevice();
                  } else {
                    void handleEnablePush();
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {iosNeedsInstall && (
        <div className="rounded-2xl bg-amber-50 p-3.5 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Install Interlink to Home Screen on iOS</p>
          <p className="mt-1 leading-relaxed">
            Apple iOS supports Web Push notifications only inside installed Home Screen apps
            (iOS 16.4+). Tap the Safari <strong>Share</strong> icon, select{" "}
            <strong>Add to Home Screen</strong>, launch Interlink from your Home Screen, and then
            enable notifications here.
          </p>
        </div>
      )}

      {!iosNeedsInstall && !supported && (
        <div className="rounded-2xl bg-interlink-app-bg/70 p-3.5 text-xs text-interlink-muted">
          This browser does not support Web Push APIs. Open Interlink in Chrome, Edge, Firefox, or
          an installed Android/iOS PWA to enable background push notifications.
        </div>
      )}

      {permission === "denied" && (
        <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-red-900 dark:bg-red-950/30 dark:text-red-200">
          Notifications are currently blocked for this site. Open your browser or device site
          settings for Interlink and set <strong>Notifications</strong> to <strong>Allow</strong>,
          then reload this page.
        </div>
      )}

      {/* Registered Devices */}
      {devices.length > 0 && (
        <div className="space-y-2 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-interlink-muted">
            Connected Devices ({devices.length})
          </p>
          <ul className="space-y-2">
            {devices.map((device) => {
              const isCurrent = device.endpoint === currentEndpoint;
              return (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-interlink-app-bg/70 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {device.platform === "android" || device.platform === "ios" ? (
                      <Smartphone className="h-4 w-4 text-interlink-forest" />
                    ) : (
                      <Laptop className="h-4 w-4 text-interlink-forest" />
                    )}
                    <div>
                      <p className="font-semibold text-interlink-ink">
                        {device.deviceLabel || "Registered Device"}{" "}
                        {isCurrent && (
                          <span className="ml-1 rounded-full bg-interlink-forest/15 px-2 py-0.5 text-[10px] font-semibold text-interlink-forest">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-interlink-muted">
                        Platform: {device.platform}
                        {device.lastUsedAt
                          ? ` · Last delivered ${formatDateTime(device.lastUsedAt)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveDevice(device.id, device.endpoint)}
                    aria-label="Remove device subscription"
                    className="inline-flex items-center gap-1 rounded-full border border-interlink-border px-2.5 py-1 text-[11px] font-medium text-interlink-muted transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="space-y-2.5 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-interlink-muted">
          Notifications
        </p>
        <div className="divide-y divide-interlink-border/40 rounded-2xl bg-interlink-app-bg/55">
          {PREF_CONFIG.map((item) => {
            const pref = prefsMap[item.type] ?? {
              notificationType: item.type,
              inAppEnabled: true,
              emailEnabled: true,
              pushEnabled: true,
            };
            const enabled = pref.inAppEnabled || pref.pushEnabled;
            const busy = savingPrefType === item.type;

            return (
              <div
                key={item.type}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-interlink-ink">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-interlink-muted">{item.description}</p>
                </div>

                <div className="flex shrink-0 items-center">
                  <ToggleSwitch
                    checked={enabled}
                    disabled={busy}
                    label={`${item.label} notifications`}
                    onToggle={() => void togglePref(item.type)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
