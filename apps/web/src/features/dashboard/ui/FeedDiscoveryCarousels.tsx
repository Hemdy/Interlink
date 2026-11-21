"use client";

import React, { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlatformEventItem, PublicMentorSummary } from "@interlink/types";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { hasExtendedEventDetails } from "@/features/events/domain/eventDetails";

const MENTORS_PER_VIEW_GROUP = 4;

export function MentorDiscoveryCarousel({
  mentors,
}: {
  mentors: PublicMentorSummary[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);

  const mentorGroups = useMemo(() => {
    const groups: PublicMentorSummary[][] = [];
    for (let i = 0; i < mentors.length; i += MENTORS_PER_VIEW_GROUP) {
      groups.push(mentors.slice(i, i + MENTORS_PER_VIEW_GROUP));
    }
    return groups;
  }, [mentors]);

  if (mentors.length === 0) return null;

  const hasMultipleGroups = mentorGroups.length > 1;

  function handleScrollerScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth <= 0) return;
    const nextIdx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveGroup(Math.max(0, Math.min(mentorGroups.length - 1, nextIdx)));
  }

  function scrollToGroup(index: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(mentorGroups.length - 1, index));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActiveGroup(clamped);
  }

  return (
    <section
      aria-label="Suggested mentors"
      className="rounded-3xl bg-[#10261b] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.32)] sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Mentors to Connect With
            </h2>
            <p className="text-[11px] text-emerald-100/70">
              {hasMultipleGroups
                ? "Swipe horizontally to discover more mentors"
                : "Practitioners accepting mentees right now"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMultipleGroups && (
            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => scrollToGroup(activeGroup - 1)}
                disabled={activeGroup === 0}
                aria-label="Previous mentor group"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollToGroup(activeGroup + 1)}
                disabled={activeGroup >= mentorGroups.length - 1}
                aria-label="Next mentor group"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-35"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
          <Link
            href="/mentors"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
          >
            All <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScrollerScroll}
        data-mentor-carousel="true"
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 scroll-smooth"
      >
        {mentorGroups.map((group, groupIdx) => (
          <div
            key={`mentor-group-${groupIdx}`}
            data-mentor-group={groupIdx}
            className="grid w-full shrink-0 snap-center snap-always grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {group.map((mentor) => {
              const roleLine = [mentor.currentPosition, mentor.organisation]
                .filter(Boolean)
                .join(" · ");

              return (
                <div
                  key={mentor.userId}
                  className="flex flex-col items-center justify-between rounded-2xl bg-[#163425] p-3.5 text-center transition-colors hover:bg-[#1c412f]"
                >
                  <Link
                    href={`/mentors/${mentor.userId}`}
                    className="flex w-full flex-col items-center focus:outline-none"
                  >
                    <div className="relative">
                      <UserAvatar
                        src={mentor.profileImage}
                        firstName={mentor.firstName}
                        lastName={mentor.lastName}
                        size="lg"
                      />
                      {mentor.verificationStatus === "verified" && (
                        <span
                          title="Verified Mentor"
                          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                        >
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    <p className="mt-2.5 w-full truncate text-xs font-semibold text-white">
                      {mentor.firstName} {mentor.lastName}
                    </p>
                    <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-[11px] leading-snug text-emerald-100/70">
                      {roleLine || "Industry Mentor"}
                    </p>
                  </Link>

                  <Link
                    href={`/mentors/${mentor.userId}#request`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-interlink-forest px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                  >
                    Connect
                  </Link>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hasMultipleGroups && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {mentorGroups.map((_, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              onClick={() => scrollToGroup(idx)}
              aria-label={`View mentor group ${idx + 1} of ${mentorGroups.length}`}
              className={`h-1.5 rounded-full transition-all ${
                activeGroup === idx
                  ? "w-5 bg-emerald-400"
                  : "w-1.5 bg-white/25 hover:bg-white/45"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function EventsPromotionsCarousel({
  events,
  registeredEventIds,
  onSelectInlineRsvp,
}: {
  events: PlatformEventItem[];
  registeredEventIds: Record<string, boolean>;
  onSelectInlineRsvp: (event: PlatformEventItem) => void;
}) {
  if (events.length === 0) return null;

  return (
    <section
      aria-label="Events and promotions"
      className="rounded-3xl bg-[#10261b] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.32)] sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-interlink-gold/20 text-interlink-gold">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Events &amp; Promotions
            </h2>
            <p className="text-[11px] text-emerald-100/70">
              Workshops, featured cohorts &amp; partner spotlights
            </p>
          </div>
        </div>
        <Link
          href="/learn"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 hover:underline"
        >
          More <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="no-scrollbar flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1">
        {events.map((event) => {
          const hasMore = hasExtendedEventDetails(event);
          const isRegistered = Boolean(
            registeredEventIds[event.id] || event.isRegistered,
          );
          const badgeLabel =
            event.category === "opportunity"
              ? "Opportunity"
              : event.category === "promotion"
                ? "Sponsored"
                : event.category;

          return (
            <article
              key={event.id}
              className="flex w-[268px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-[#163425] transition-colors hover:bg-[#1c412f] sm:w-[290px]"
            >
              {hasMore ? (
                <Link
                  href={`/events/${event.id}`}
                  className="group block focus:outline-none"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a1911]">
                    <Image
                      src={event.imageUrl || "/images/workshop-collaboration.jpg"}
                      alt={event.title}
                      fill
                      sizes="290px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#163425]/85 via-black/15 to-transparent" />
                    <div className="absolute left-2.5 right-2.5 top-2.5 flex items-center justify-between">
                      <Badge tone="forest" className="capitalize">
                        {badgeLabel}
                      </Badge>
                      {event.isFeatured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-interlink-gold/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-3.5 pt-3">
                    <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-white group-hover:text-emerald-300">
                      {event.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-emerald-100/75">
                      {event.summary}
                    </p>
                  </div>
                </Link>
              ) : (
                <div>
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0a1911]">
                    <Image
                      src={event.imageUrl || "/images/workshop-collaboration.jpg"}
                      alt={event.title}
                      fill
                      sizes="290px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#163425]/85 via-black/15 to-transparent" />
                    <div className="absolute left-2.5 top-2.5">
                      <span className="inline-flex rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-semibold capitalize text-emerald-100 backdrop-blur-sm">
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                  <div className="px-3.5 pt-3">
                    <h3 className="font-display text-sm font-semibold leading-snug text-white">
                      {event.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/75">
                      {event.summary}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-auto space-y-2.5 px-3.5 pb-3.5 pt-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-100/70">
                  {event.eventDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                      {new Date(event.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-emerald-300" aria-hidden="true" />
                    <span className="truncate">{event.locationOrFormat}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5">
                  <span className="text-[11px] font-medium text-emerald-100/70">
                    {(event.registrationCount ?? 0) + (isRegistered ? 1 : 0)} going
                  </span>

                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Going
                    </span>
                  ) : hasMore ? (
                    <Link
                      href={`/events/${event.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-interlink-forest px-3.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                    >
                      View Details
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectInlineRsvp(event)}
                      className="rounded-full bg-interlink-forest px-3.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                    >
                      {event.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
