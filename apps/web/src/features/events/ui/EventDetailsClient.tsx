"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlatformEventItem, SessionUser } from "@interlink/types";
import { formatDateTime } from "@interlink/utils";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  MapPin,
  Users,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";

export function EventDetailsClient({
  event,
  user,
}: {
  event: PlatformEventItem;
  user: SessionUser;
}) {
  const { pushToast } = useToast();
  const [registered, setRegistered] = useState(Boolean(event.isRegistered));
  const [count, setCount] = useState(event.registrationCount ?? 0);
  const [attendeeName, setAttendeeName] = useState(
    `${user.firstName} ${user.lastName}`.trim(),
  );
  const [attendeeEmail, setAttendeeEmail] = useState(user.email);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRsvp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await postJson(
        "/api/v1/events/register",
        {
          eventId: event.id,
          attendeeName,
          attendeeEmail,
        },
        "Unable to complete registration.",
      );
      if (!res.ok) {
        setError(res.errorMessage ?? "Unable to register.");
        return;
      }
      setRegistered(true);
      setCount((c) => c + 1);
      pushToast({
        kind: "success",
        title: "Seat reserved!",
        description: `You are registered for ${event.title}.`,
      });
    } catch {
      setError("Network error completing registration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-interlink-border bg-interlink-surface px-3.5 py-1.5 text-xs font-semibold text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Feed
        </Link>
      </div>

      <Card elevated className="overflow-hidden rounded-3xl p-0">
        <div className="relative aspect-[16/9] w-full bg-interlink-app-bg">
          <Image
            src={event.imageUrl || "/images/workshop-collaboration.jpg"}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute left-5 right-5 top-5 flex items-center justify-between gap-2">
            <Badge tone="forest" className="capitalize">
              {event.category}
            </Badge>
            {event.isFeatured && (
              <span className="rounded-full bg-interlink-gold/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Featured
              </span>
            )}
          </div>
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <h1 className="font-display text-2xl font-bold leading-snug sm:text-3xl">
              {event.title}
            </h1>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-interlink-muted">
            {event.eventDate && (
              <span className="inline-flex items-center gap-1.5 font-medium text-interlink-ink">
                <Calendar className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
                {formatDateTime(event.eventDate)} UTC
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-medium text-interlink-ink">
              <MapPin className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
              {event.locationOrFormat}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
              {count} registered
            </span>
          </div>

          <div className="rounded-2xl border border-interlink-border/70 bg-interlink-app-bg/40 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-interlink-forest">
              About This{" "}
              {event.category === "promotion"
                ? "Promotion"
                : event.category === "opportunity"
                  ? "Opportunity"
                  : event.category === "workshop"
                    ? "Workshop"
                    : "Event"}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-interlink-ink/90">
              {event.summary}
            </p>
          </div>

          {event.ctaUrl ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-interlink-border/60 pt-4">
              <p className="text-xs text-interlink-muted">
                Continue on the official program page to complete your application.
              </p>
              <Link
                href={event.ctaUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-interlink-forest px-5 py-2.5 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
              >
                {event.ctaLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : registered ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-interlink-forest" aria-hidden="true" />
              <span>Your spot is reserved for {event.title}.</span>
            </div>
          ) : (
            <form
              onSubmit={handleRsvp}
              className="space-y-3 border-t border-interlink-border/60 pt-4"
            >
              <h3 className="font-display text-sm font-semibold text-interlink-ink">
                Reserve Your Spot
              </h3>
              {error && <ErrorAlert message={error} />}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" loading={submitting}>
                {event.ctaLabel}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
