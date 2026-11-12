"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, CheckCircle2, MapPin, Megaphone, Users } from "lucide-react";
import type { EventCategory, PlatformEventItem, SessionUser } from "@interlink/types";
import { formatDateTime } from "@interlink/utils";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Reveal } from "@/components/ui/Reveal";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";

const CATEGORY_LABELS: Record<"all" | EventCategory, string> = {
  all: "All",
  workshop: "Workshops",
  event: "Events",
  opportunity: "Opportunities",
  promotion: "Promotions",
};

const CATEGORY_TONES: Record<EventCategory, "forest" | "info" | "warning" | "neutral"> = {
  workshop: "forest",
  event: "info",
  opportunity: "warning",
  promotion: "neutral",
};

export function PromotionsEventsSection({
  initialEvents,
  user,
}: {
  initialEvents: PlatformEventItem[];
  user: SessionUser | null;
}) {
  const { pushToast } = useToast();
  const [events, setEvents] = useState<PlatformEventItem[]>(initialEvents);
  const [selectedCategory, setSelectedCategory] = useState<"all" | EventCategory>("all");
  const [rsvpTarget, setRsvpTarget] = useState<PlatformEventItem | null>(null);
  const [registeredIds, setRegisteredIds] = useState<Record<string, boolean>>({});

  const [attendeeName, setAttendeeName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : "",
  );
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const visibleEvents = useMemo(
    () =>
      selectedCategory === "all"
        ? events
        : events.filter((item) => item.category === selectedCategory),
    [events, selectedCategory],
  );

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvpTarget) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await postJson(
        "/api/v1/events/register",
        {
          eventId: rsvpTarget.id,
          attendeeName,
          attendeeEmail,
        },
        "Unable to complete registration.",
      );
      if (!result.ok) {
        setFormError(result.errorMessage ?? "Unable to complete registration.");
        return;
      }

      setRegisteredIds((prev) => ({ ...prev, [rsvpTarget.id]: true }));
      setEvents((prev) =>
        prev.map((item) =>
          item.id === rsvpTarget.id
            ? { ...item, registrationCount: (item.registrationCount ?? 0) + 1 }
            : item,
        ),
      );
      pushToast({
        kind: "success",
        title: "Registration confirmed",
        description: `You are registered for ${rsvpTarget.title}.`,
      });
      setRsvpTarget(null);
    } catch {
      setFormError("Network error while submitting your registration.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-interlink-border bg-interlink-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
        <Reveal>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
                <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                Promotions &amp; Events
              </p>
              <h2 className="mt-2 font-display text-2xl font-light text-interlink-ink sm:text-3xl">
                Upcoming workshops, community events, and featured opportunities.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-interlink-muted">
                Join live career clinics, leadership summits, and partner fellowships curated for
                Interlink mentors and mentees.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as Array<"all" | EventCategory>).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-[2px] border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? "border-interlink-forest bg-interlink-forest text-white"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {visibleEvents.map((item, idx) => {
            const isRegistered = Boolean(registeredIds[item.id] || item.isRegistered);

            return (
              <Reveal key={item.id} delayMs={idx * 80} className="h-full">
                <Card
                  elevated
                  className="flex h-full flex-col overflow-hidden p-0 hover:-translate-y-0.5 hover:border-interlink-forest/50 sm:flex-row"
                >
                  <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-interlink-app-bg sm:aspect-auto sm:w-48 md:w-52">
                    <Image
                      src={item.imageUrl || "/images/workshop-collaboration.jpg"}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 220px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge tone={CATEGORY_TONES[item.category]} className="capitalize">
                          {item.category}
                        </Badge>
                        {item.isFeatured && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-interlink-gold">
                            Featured
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug text-interlink-ink">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-interlink-muted">
                        {item.summary}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-interlink-muted">
                        {item.eventDate && (
                          <p className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-interlink-forest" aria-hidden="true" />
                            <span>{formatDateTime(item.eventDate)} UTC</span>
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-interlink-forest" aria-hidden="true" />
                          <span>{item.locationOrFormat}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-interlink-border/70 pt-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-interlink-muted">
                        <Users className="h-3.5 w-3.5 text-interlink-forest" aria-hidden="true" />
                        {item.registrationCount ?? 0} registered
                      </span>

                      {isRegistered ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-interlink-forest">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Registered
                        </span>
                      ) : item.ctaUrl ? (
                        <Link
                          href={item.ctaUrl}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-interlink-forest hover:underline"
                        >
                          {item.ctaLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setFormError(null);
                            setRsvpTarget(item);
                          }}
                        >
                          {item.ctaLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(rsvpTarget)}
        onClose={() => setRsvpTarget(null)}
        title={rsvpTarget ? `Register: ${rsvpTarget.title}` : "Event Registration"}
        maxWidthClass="max-w-[460px]"
      >
        {rsvpTarget && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-xs leading-relaxed text-interlink-muted">
              {rsvpTarget.locationOrFormat}
              {rsvpTarget.eventDate ? ` · ${formatDateTime(rsvpTarget.eventDate)} UTC` : ""}
            </p>
            {formError && <ErrorAlert message={formError} />}
            <Input
              label="Full Name"
              value={attendeeName}
              onChange={(e) => setAttendeeName(e.target.value)}
              placeholder="Your full name"
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={attendeeEmail}
              onChange={(e) => setAttendeeEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRsvpTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Confirm Registration
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
