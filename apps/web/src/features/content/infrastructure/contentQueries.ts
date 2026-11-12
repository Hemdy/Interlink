import { desc, eq, sql } from "drizzle-orm";
import {
  eventRegistrations,
  getDb,
  isDatabaseConfigured,
  mentorReels,
  platformEvents,
} from "@interlink/database";
import type { EventCategory, MentorReelItem, PlatformEventItem } from "@interlink/types";

export const DEFAULT_MENTOR_REELS: MentorReelItem[] = [
  {
    id: "reel-spotlight-1",
    mentorId: null,
    mentorName: "Dr. Amara Okafor",
    profession: "VP of Product Engineering",
    careerPath: "Software Engineer -> Engineering Manager -> VP of Product Engineering",
    title: "How to Navigate Your First Senior Role Transition",
    summary:
      "Why shifting from individual execution to multiplying your team's impact starts with structured mentorship and deliberate communication.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterImageUrl: "/images/mentor-spotlight.jpg",
    durationLabel: "0:48",
    topicTag: "Leadership",
    createdAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "reel-spotlight-2",
    mentorId: null,
    mentorName: "Chidi Nwosu",
    profession: "Principal Solutions Architect",
    careerPath: "Support Analyst -> Cloud Consultant -> Principal Architect",
    title: "Building High-Trust Technical Portfolios That Stand Out",
    summary:
      "Practical advice on documenting architecture decisions, real-world trade-offs, and measurable outcomes that hiring leaders look for.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterImageUrl: "/images/mentorship-coaching.jpg",
    durationLabel: "0:55",
    topicTag: "Career Growth",
    createdAt: "2026-11-03T10:00:00.000Z",
  },
  {
    id: "reel-spotlight-3",
    mentorId: null,
    mentorName: "Zainab Bello",
    profession: "Director of Product Design",
    careerPath: "Visual Designer -> Product Designer -> Director of Design",
    title: "Turning Constructive Feedback Into Career Momentum",
    summary:
      "How to ask mentors sharper questions, run 30-day growth experiments, and build confidence across cross-functional teams.",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterImageUrl: "/images/workshop-collaboration.jpg",
    durationLabel: "0:42",
    topicTag: "Product & Design",
    createdAt: "2026-11-05T10:00:00.000Z",
  },
];

export const DEFAULT_PLATFORM_EVENTS: PlatformEventItem[] = [
  {
    id: "event-workshop-1",
    title: "Career Transition & Portfolio Clinic",
    category: "workshop",
    summary:
      "Interactive live review with verified engineering and product mentors covering CV positioning, case studies, and interview storytelling.",
    imageUrl: "/images/workshop-collaboration.jpg",
    eventDate: "2026-11-28T16:00:00.000Z",
    locationOrFormat: "Live Virtual Workshop",
    ctaLabel: "Reserve Seat",
    ctaUrl: null,
    isFeatured: true,
    registrationCount: 24,
  },
  {
    id: "event-networking-2",
    title: "Interlink Leadership & Mentorship Summit",
    category: "event",
    summary:
      "Connect with industry leaders, founders, and peers for structured speed-mentoring rounds and career roundtable discussions.",
    imageUrl: "/images/networking-event.jpg",
    eventDate: "2026-12-06T14:00:00.000Z",
    locationOrFormat: "Lagos & Virtual Hybrid",
    ctaLabel: "Register Now",
    ctaUrl: null,
    isFeatured: true,
    registrationCount: 41,
  },
  {
    id: "event-opportunity-3",
    title: "Q1 Verified Mentor Fellowship Cohort",
    category: "opportunity",
    summary:
      "Applications are open for experienced professionals ready to mentor 2–3 rising practitioners through structured 12-week goals.",
    imageUrl: "/images/mentorship-coaching.jpg",
    eventDate: "2026-12-15T12:00:00.000Z",
    locationOrFormat: "Global Mentor Cohort",
    ctaLabel: "Apply to Cohort",
    ctaUrl: "/become-a-mentor",
    isFeatured: false,
    registrationCount: 18,
  },
  {
    id: "event-promo-4",
    title: "Sponsored Spotlight: Emerging Tech Career Accelerator",
    category: "promotion",
    summary:
      "Partner opportunity offering scholarship seats, 1-on-1 mock interviews, and verified mentorship matching for early-career talent.",
    imageUrl: "/images/mentor-spotlight.jpg",
    eventDate: null,
    locationOrFormat: "Featured Partner Promotion",
    ctaLabel: "Claim Opportunity",
    ctaUrl: null,
    isFeatured: false,
    registrationCount: 33,
  },
];

export async function listPublishedMentorReels(): Promise<MentorReelItem[]> {
  if (!isDatabaseConfigured()) {
    return DEFAULT_MENTOR_REELS;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(mentorReels)
      .where(eq(mentorReels.isPublished, true))
      .orderBy(desc(mentorReels.createdAt))
      .limit(12);

    if (rows.length === 0) {
      return DEFAULT_MENTOR_REELS;
    }

    return rows.map((row) => ({
      id: row.id,
      mentorId: row.mentorId,
      mentorName: row.mentorName,
      profession: row.profession,
      careerPath: row.careerPath,
      title: row.title,
      summary: row.summary,
      videoUrl: row.videoUrl,
      posterImageUrl: row.posterImageUrl,
      durationLabel: row.durationLabel,
      topicTag: row.topicTag,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch {
    return DEFAULT_MENTOR_REELS;
  }
}

export async function listPublishedPlatformEvents(
  category?: EventCategory,
): Promise<PlatformEventItem[]> {
  if (!isDatabaseConfigured()) {
    return category
      ? DEFAULT_PLATFORM_EVENTS.filter((e) => e.category === category)
      : DEFAULT_PLATFORM_EVENTS;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(platformEvents)
      .where(eq(platformEvents.isPublished, true))
      .orderBy(desc(platformEvents.isFeatured), desc(platformEvents.createdAt))
      .limit(16);

    if (rows.length === 0) {
      return category
        ? DEFAULT_PLATFORM_EVENTS.filter((e) => e.category === category)
        : DEFAULT_PLATFORM_EVENTS;
    }

    const regCounts = await db
      .select({
        eventId: eventRegistrations.eventId,
        total: sql<number>`count(*)::int`,
      })
      .from(eventRegistrations)
      .groupBy(eventRegistrations.eventId);

    const countMap = new Map(regCounts.map((r) => [r.eventId, Number(r.total)]));

    const mapped: PlatformEventItem[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: (row.category as EventCategory) || "workshop",
      summary: row.summary,
      imageUrl: row.imageUrl,
      eventDate: row.eventDate ? row.eventDate.toISOString() : null,
      locationOrFormat: row.locationOrFormat,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl,
      isFeatured: row.isFeatured,
      registrationCount: countMap.get(row.id) ?? 0,
    }));

    return category ? mapped.filter((item) => item.category === category) : mapped;
  } catch {
    return category
      ? DEFAULT_PLATFORM_EVENTS.filter((e) => e.category === category)
      : DEFAULT_PLATFORM_EVENTS;
  }
}
