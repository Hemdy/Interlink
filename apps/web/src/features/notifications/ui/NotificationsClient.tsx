"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/ToastProvider";

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
  const router = useRouter();
  const { pushToast } = useToast();
  const [items, setItems] = useState(initialNotifications);

  async function markAllRead() {
    const res = await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      pushToast({ kind: "success", title: "All notifications marked as read" });
      router.refresh();
    }
  }

  async function markOneRead(id: string) {
    const res = await fetch("/api/v1/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      router.refresh();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" /> Mark All Read
        </Button>
      </div>

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
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-interlink-ink">{n.title}</h2>
                {!n.isRead && <Badge tone="forest">New</Badge>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{n.message}</p>
              <p className="mt-1.5 text-xs text-interlink-muted">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {n.actionUrl && (
                <Link
                  href={n.actionUrl}
                  onClick={() => void markOneRead(n.id)}
                  className="rounded-[2px] border border-interlink-hairline bg-interlink-surface px-3 py-1.5 text-xs font-medium text-interlink-ink hover:border-interlink-forest"
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
