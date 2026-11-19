"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@interlink/utils";
import { Bell, CheckCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
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

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: NotificationItem[];
}) {
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

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-5 w-5" />}
        title="You're all caught up"
        description="Notifications for mentorship requests, sessions, goals, messages, and verification updates appear here."
      />
    );
  }

  const hasUnread = items.some((n) => !n.isRead);

  return (
    <div className="space-y-4">
      {hasUnread && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        </div>
      )}

      {items.map((n) => (
        <Card
          key={n.id}
          className={
            n.isRead
              ? "bg-interlink-surface"
              : "border-interlink-forest/40 bg-interlink-forest/5"
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-interlink-ink">{n.title}</h2>
                {!n.isRead && <Badge tone="forest">New</Badge>}
              </div>
              <p className="mt-1 text-sm text-interlink-muted">{n.message}</p>
              <p className="mt-1.5 text-xs text-interlink-muted">
                {formatDateTime(n.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {n.actionUrl && (
                <Link
                  href={n.actionUrl}
                  onClick={() => void markOneRead(n.id)}
                  className="rounded-full border border-interlink-border bg-interlink-surface px-3.5 py-1.5 text-xs font-semibold text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                >
                  Open
                </Link>
              )}
              {!n.isRead && (
                <Button size="sm" variant="ghost" onClick={() => markOneRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
