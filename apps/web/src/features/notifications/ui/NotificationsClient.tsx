"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChevronLeft,
  Heart,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";
import { setOptimisticUnreadNotifications } from "@/features/pwa/useNavigationMode";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

function getDateBucket(iso: string): "Today" | "Yesterday" | "Others" {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Others";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Others";
}

function formatCompactTimestamp(iso: string, bucket: "Today" | "Yesterday" | "Others"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (bucket === "Others") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s+/g, "")
    .toLowerCase();
}

function getNotificationVisual(type: string): {
  icon: React.ComponentType<{ className?: string }>;
  containerClass: string;
} {
  if (type === "post_liked") {
    return {
      icon: Heart,
      containerClass:
        "bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm",
    };
  }
  if (type === "post_commented" || type === "new_message") {
    return {
      icon: MessageCircle,
      containerClass:
        "bg-gradient-to-br from-interlink-forest to-emerald-600 text-white shadow-sm",
    };
  }
  if (type === "new_post") {
    return {
      icon: Sparkles,
      containerClass:
        "bg-gradient-to-br from-amber-400 to-interlink-gold text-white shadow-sm",
    };
  }
  if (type === "session_scheduled" || type === "session_rescheduled") {
    return {
      icon: Video,
      containerClass:
        "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm",
    };
  }
  if (type.startsWith("session_")) {
    return {
      icon: Calendar,
      containerClass:
        "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm",
    };
  }
  if (type.startsWith("request_") || type === "info_requested") {
    return {
      icon: Users,
      containerClass:
        "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm",
    };
  }
  if (type.startsWith("goal_") || type === "progress_submitted" || type === "mentor_feedback") {
    return {
      icon: Target,
      containerClass:
        "bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm",
    };
  }
  if (type === "verification_changed") {
    return {
      icon: ShieldCheck,
      containerClass:
        "bg-gradient-to-br from-interlink-forest to-teal-700 text-white shadow-sm",
    };
  }
  return {
    icon: Bell,
    containerClass:
      "bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-sm",
  };
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [items, setItems] = useState(initialNotifications);

  async function markAllRead() {
    const unreadCount = items.filter((n) => !n.isRead).length;
    if (unreadCount === 0) return;

    const previousItems = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setOptimisticUnreadNotifications(0);
    pushToast({ kind: "success", title: "All notifications marked as read" });

    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setItems(previousItems);
      setOptimisticUnreadNotifications(unreadCount);
      pushToast({ kind: "error", title: "Could not mark all notifications as read" });
    }
  }

  async function markOneRead(id: string) {
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;

    const previousItems = items;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setOptimisticUnreadNotifications((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setItems(previousItems);
      setOptimisticUnreadNotifications((prev) => prev + 1);
      pushToast({ kind: "error", title: "Unable to mark notification as read" });
    }
  }

  const groupedSections = useMemo(() => {
    const buckets: Record<"Today" | "Yesterday" | "Others", NotificationItem[]> = {
      Today: [],
      Yesterday: [],
      Others: [],
    };
    for (const item of items) {
      buckets[getDateBucket(item.createdAt)].push(item);
    }
    return (["Today", "Yesterday", "Others"] as const)
      .filter((key) => buckets[key].length > 0)
      .map((key) => ({ label: key, rows: buckets[key] }));
  }, [items]);

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {/* Minimal Header Matching Reference Layout */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-interlink-ink transition-colors hover:bg-interlink-surface focus-ring"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <h1 className="font-display text-lg font-semibold tracking-tight text-interlink-ink">
          Notifications
        </h1>

        <Link
          href="/account#cat-notifications"
          aria-label="Notification preferences"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-interlink-ink transition-colors hover:bg-interlink-surface focus-ring"
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="You're all caught up"
          description="Notifications for posts, likes, comments, mentorship requests, sessions, goals, and messages appear here."
        />
      ) : (
        <>
          <div className="space-y-5">
            {groupedSections.map((section) => (
              <section key={section.label} className="space-y-2.5">
                <h2 className="px-1 text-xs font-medium text-interlink-muted">
                  {section.label}
                </h2>
                <div className="space-y-2.5">
                  {section.rows.map((n) => {
                    const visual = getNotificationVisual(n.type);
                    const Icon = visual.icon;
                    const timeText = formatCompactTimestamp(n.createdAt, section.label);

                    const cardInner = (
                      <div className="flex items-center gap-3.5">
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-full ${visual.containerClass}`}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </div>
                          {!n.isRead && (
                            <span
                              aria-label="Unread"
                              className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-interlink-surface"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-interlink-ink">
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[11px] font-medium text-interlink-muted">
                              {timeText}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-interlink-muted">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    );

                    const baseCardClass = `block w-full rounded-2xl border px-3.5 py-3 text-left transition-colors focus-ring ${
                      n.isRead
                        ? "border-interlink-border/60 bg-interlink-surface hover:border-interlink-forest/40"
                        : "border-interlink-forest/25 bg-interlink-surface shadow-subtle hover:border-interlink-forest/55"
                    }`;

                    if (n.actionUrl) {
                      return (
                        <Link
                          key={n.id}
                          href={n.actionUrl}
                          onClick={() => void markOneRead(n.id)}
                          className={baseCardClass}
                        >
                          {cardInner}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => void markOneRead(n.id)}
                        className={baseCardClass}
                      >
                        {cardInner}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {hasUnread && (
            <div className="flex justify-center pt-3">
              <Button
                type="button"
                onClick={markAllRead}
                className="rounded-2xl px-8 py-3 text-sm font-semibold shadow-card"
              >
                Mark all as read
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
