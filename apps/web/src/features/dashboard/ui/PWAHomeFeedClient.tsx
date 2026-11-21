"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Compass,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Route,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { formatDateTime } from "@interlink/utils";
import type {
  MentorReelItem,
  PlatformEventItem,
  PublicMentorSummary,
  SessionUser,
} from "@interlink/types";
import { Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { CommunityPostItem } from "@/features/content/infrastructure/postQueries";
import { CreatePostModal } from "@/features/dashboard/ui/CreatePostModal";
import {
  EventsPromotionsCarousel,
  MentorDiscoveryCarousel,
} from "@/features/dashboard/ui/FeedDiscoveryCarousels";
import { useFeedVideoAutoplay } from "@/features/dashboard/ui/useFeedVideoAutoplay";
import { hasExtendedEventDetails } from "@/features/events/domain/eventDetails";
import { useNavigationMode } from "@/features/pwa/useNavigationMode";
import { postJson } from "@/lib/api/client";

export interface FeedSessionItem {
  id: string;
  mentorshipId: string;
  title: string;
  startTime: string;
  status: string;
  partnerName: string;
  partnerImage: string | null;
}

export interface FeedRequestItem {
  id: string;
  menteeName: string;
  menteeImage: string | null;
  careerObjective: string;
  createdAt: string;
}

export interface FeedGoalItem {
  id: string;
  mentorshipId: string;
  title: string;
  status: string;
}

export interface FeedPostItem {
  id: string;
  authorName: string;
  authorRole: string;
  topic: string;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
}

type FeedFilter = "all" | "mentors" | "reels" | "events" | "sessions" | "posts";

type FeedEntry =
  | { kind: "community_post"; feedKey: string; post: CommunityPostItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "reel"; feedKey: string; reel: MentorReelItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "mentor_carousel"; feedKey: string; mentors: PublicMentorSummary[] }
  | { kind: "events_carousel"; feedKey: string; events: PlatformEventItem[] }
  | { kind: "mentor"; feedKey: string; mentor: PublicMentorSummary; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "event"; feedKey: string; event: PlatformEventItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "session"; feedKey: string; session: FeedSessionItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "request"; feedKey: string; request: FeedRequestItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "goal"; feedKey: string; goal: FeedGoalItem; initialLikes: number; initialComments: FeedComment[] }
  | { kind: "post"; feedKey: string; post: FeedPostItem; initialLikes: number; initialComments: FeedComment[] };

interface FeedComment {
  id: string;
  authorId?: string;
  author: string;
  text: string;
  timeLabel: string;
}

const DEFAULT_COMMUNITY_POSTS: FeedPostItem[] = [
  {
    id: "post-career-pivot",
    authorName: "Interlink Editorial",
    authorRole: "Career Community",
    topic: "Career Pivot",
    title: "3 questions to ask a mentor before switching industries",
    body: "Instead of asking 'How do I get hired?', ask: What portfolio artifact proves I can think like a practitioner on week one? What skills transfer cleanly? And what habit makes new hires succeed in their first 90 days?",
    href: "/learn",
    ctaLabel: "Explore Career Paths",
  },
  {
    id: "post-cohort-prep",
    authorName: "Mentorship Circle",
    authorRole: "Community Thread",
    topic: "Growth Habits",
    title: "Small weekly milestones beat vague 1-year career resolutions",
    body: "Mentees who define one shippable milestone every two weeks are over twice as likely to land interviews or promotions within a quarter. Set your next target inside your mentorship workspace.",
    href: "/goals",
    ctaLabel: "View My Goals",
  },
  {
    id: "post-mentor-craft",
    authorName: "Verified Mentors Hub",
    authorRole: "Mentor Tips",
    topic: "Leadership",
    title: "Async feedback loops that keep momentum high between 1:1s",
    body: "Share a 2-sentence check-in before your scheduled session so call time focuses purely on real blockers, architecture reviews, and decision-making.",
    href: "/messages",
    ctaLabel: "Open Conversations",
  },
];

const BATCH_SIZE = 12;

function FeedCardActionBar({
  liked,
  likesCount,
  commentsCount,
  bookmarked,
  onLike,
  onComment,
  onBookmark,
  onShare,
  likeLabel = "Like post",
  commentLabel = "Comment on post",
  bookmarkLabel = "Bookmark post",
  shareLabel = "Share post",
  trailing,
}: {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
  bookmarked: boolean;
  onLike: () => void;
  onComment: () => void;
  onBookmark: () => void;
  onShare: () => void;
  likeLabel?: string;
  commentLabel?: string;
  bookmarkLabel?: string;
  shareLabel?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      data-post-actions="true"
      className="flex flex-wrap items-center justify-between gap-2 bg-[#0d2117] px-4 py-2.5 text-emerald-100/80"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onLike}
          aria-label={likeLabel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-rose-400 focus-ring"
        >
          <Heart
            className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`}
            aria-hidden="true"
          />
          <span>{likesCount}</span>
        </button>

        <button
          type="button"
          onClick={onComment}
          aria-label={commentLabel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-white focus-ring"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{commentsCount}</span>
        </button>

        <button
          type="button"
          onClick={onBookmark}
          aria-label={bookmarkLabel}
          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-emerald-300 focus-ring"
        >
          <Bookmark
            className={`h-4 w-4 ${bookmarked ? "fill-amber-400 text-amber-400" : ""}`}
            aria-hidden="true"
          />
        </button>

        <button
          type="button"
          onClick={onShare}
          aria-label={shareLabel}
          className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-white focus-ring"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}

export function PWAHomeFeedClient({
  user,
  role,
  recommendedMentors,
  directoryMentors,
  reels,
  events,
  upcomingSessions,
  pendingRequests,
  activeGoals,
  sharedPosts,
  communityPosts = [],
}: {
  user: SessionUser;
  role: "mentor" | "mentee";
  recommendedMentors: PublicMentorSummary[];
  directoryMentors: PublicMentorSummary[];
  reels: MentorReelItem[];
  events: PlatformEventItem[];
  upcomingSessions: FeedSessionItem[];
  pendingRequests: FeedRequestItem[];
  activeGoals: FeedGoalItem[];
  sharedPosts: FeedPostItem[];
  communityPosts?: CommunityPostItem[];
}) {
  const { pushToast } = useToast();
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [feedCycles, setFeedCycles] = useState(1);

  // Community Posts state (real persisted public posts + Create Post modal)
  const { useBottomNav } = useNavigationMode();
  const [livePosts, setLivePosts] = useState<CommunityPostItem[]>(communityPosts);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [showFloatingCreate, setShowFloatingCreate] = useState(false);
  const [showDockedFilterBar, setShowDockedFilterBar] = useState(false);
  const inlineFilterBarRef = useRef<HTMLDivElement | null>(null);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [previewPostMedia, setPreviewPostMedia] = useState<{
    url: string;
    kind: "image" | "document";
    title: string;
  } | null>(null);

  // Interactive social state
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [savedMentorIds, setSavedMentorIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const m of [...recommendedMentors, ...directoryMentors]) {
      if (m.isSaved) map[m.userId] = true;
    }
    return map;
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});
  const [openCommentKey, setOpenCommentKey] = useState<string | null>(null);
  const [commentModalInstanceKey, setCommentModalInstanceKey] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [userComments, setUserComments] = useState<Record<string, FeedComment[]>>({});

  // Video reel modal state
  const [activeReel, setActiveReel] = useState<MentorReelItem | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Event RSVP modal state (reuses /api/v1/events/register)
  const [rsvpTarget, setRsvpTarget] = useState<PlatformEventItem | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Record<string, boolean>>({});
  const [attendeeName, setAttendeeName] = useState(`${user.firstName} ${user.lastName}`.trim());
  const [attendeeEmail, setAttendeeEmail] = useState(user.email);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Show floating bottom-right "+" Create Post button & smoothly slide the docked category bar once scrolled past inline bar
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setShowFloatingCreate(y > 40);
      const inlineEl = inlineFilterBarRef.current;
      if (inlineEl && y > 16) {
        const rect = inlineEl.getBoundingClientRect();
        setShowDockedFilterBar(rect.top <= 68);
      } else {
        setShowDockedFilterBar(false);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore lightweight local social state (likes/bookmarks/comments) scoped to user
  useEffect(() => {
    try {
      const likesRaw = window.localStorage.getItem(`il_feed_likes_${user.id}`);
      if (likesRaw) setLikedIds(JSON.parse(likesRaw) as Record<string, boolean>);
      const bookmarksRaw = window.localStorage.getItem(`il_feed_bookmarks_${user.id}`);
      if (bookmarksRaw) setBookmarkedIds(JSON.parse(bookmarksRaw) as Record<string, boolean>);
      const commentsRaw = window.localStorage.getItem(`il_feed_comments_${user.id}`);
      if (commentsRaw) setUserComments(JSON.parse(commentsRaw) as Record<string, FeedComment[]>);
    } catch {
      // Ignore storage failures
    }
  }, [user.id]);

  // Deep-link handling for ?post=<id> from Web Push or in-app notifications
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetPostId = params.get("post");
    if (!targetPostId) return;

    setHighlightedPostId(targetPostId);
    setOpenCommentKey(`community-${targetPostId}-c0`);
    setVisibleCount((prev) => Math.max(prev, 24));

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, []);

  // Merge unique mentors across recommended + directory
  const allMentors = useMemo(() => {
    const seen = new Set<string>();
    const combined: PublicMentorSummary[] = [];
    for (const m of [...recommendedMentors, ...directoryMentors]) {
      if (m.userId === user.id) continue;
      if (seen.has(m.userId)) continue;
      seen.add(m.userId);
      combined.push(m);
    }
    return combined;
  }, [directoryMentors, recommendedMentors, user.id]);

  const allPosts = useMemo(
    () => (sharedPosts.length > 0 ? [...sharedPosts, ...DEFAULT_COMMUNITY_POSTS] : DEFAULT_COMMUNITY_POSTS),
    [sharedPosts],
  );

  // Build rich feed decks: TikTok/Reels cadence for "For You" + dedicated tab streams
  const filteredBase = useMemo<FeedEntry[]>(() => {
    const mapCommunityPost = (cPost: CommunityPostItem, suffix = ""): FeedEntry => ({
      kind: "community_post",
      feedKey: `community-${cPost.id}${suffix}`,
      post: cPost,
      initialLikes: cPost.likesCount,
      initialComments: cPost.comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        author: c.authorName,
        text: c.content,
        timeLabel: formatDateTime(c.createdAt),
      })),
    });

    const mapReel = (reel: MentorReelItem, idx: number, suffix = ""): FeedEntry => ({
      kind: "reel",
      feedKey: `reel-${reel.id}${suffix}`,
      reel,
      initialLikes: 28 + idx * 11,
      initialComments: [
        {
          id: `seed-r-${idx}`,
          author: "Community Member",
          text: `The "${reel.careerPath}" breakdown makes this path much clearer.`,
          timeLabel: "2h ago",
        },
      ],
    });

    const orderedCommunity = [...livePosts].sort((a, b) => {
      if (highlightedPostId && a.id === highlightedPostId) return -1;
      if (highlightedPostId && b.id === highlightedPostId) return 1;
      return 0;
    });

    const videoCommunity = orderedCommunity.filter(
      (p) => p.mediaType === "video" && Boolean(p.mediaUrl),
    );
    const nonVideoCommunity = orderedCommunity.filter(
      (p) => p.mediaType !== "video" || !p.mediaUrl,
    );

    const videoPoolCount = videoCommunity.length + reels.length;
    const takeVideoAt = (rawIndex: number, suffix = ""): FeedEntry | null => {
      if (videoPoolCount === 0) return null;
      const idx = rawIndex % videoPoolCount;
      if (idx < videoCommunity.length) {
        return mapCommunityPost(videoCommunity[idx]!, suffix);
      }
      const reelIdx = idx - videoCommunity.length;
      return mapReel(reels[reelIdx]!, reelIdx, suffix);
    };

    if (filter === "reels") {
      const list: FeedEntry[] = [];
      for (let i = 0; i < videoPoolCount; i++) {
        const entry = takeVideoAt(i);
        if (entry) list.push(entry);
      }
      return list;
    }

    if (filter === "mentors") {
      const list: FeedEntry[] = [];
      if (role === "mentor") {
        for (const req of pendingRequests) {
          list.push({
            kind: "request",
            feedKey: `req-${req.id}`,
            request: req,
            initialLikes: 0,
            initialComments: [],
          });
        }
      }
      for (let i = 0; i < allMentors.length; i++) {
        const mentor = allMentors[i]!;
        list.push({
          kind: "mentor",
          feedKey: `mentor-${mentor.userId}`,
          mentor,
          initialLikes: 19 + i * 7,
          initialComments: [],
        });
      }
      return list;
    }

    if (filter === "events") {
      return events.map((event, i) => ({
        kind: "event",
        feedKey: `event-${event.id}`,
        event,
        initialLikes: (event.registrationCount ?? 12) + 9,
        initialComments: [
          {
            id: `seed-e-${i}`,
            author: "Tobi A.",
            text: "Reserved my spot — excited for the live Q&A.",
            timeLabel: "5h ago",
          },
        ],
      }));
    }

    if (filter === "sessions") {
      const list: FeedEntry[] = upcomingSessions.map((session) => ({
        kind: "session",
        feedKey: `session-${session.id}`,
        session,
        initialLikes: 0,
        initialComments: [],
      }));
      for (const goal of activeGoals) {
        list.push({
          kind: "goal",
          feedKey: `goal-${goal.id}`,
          goal,
          initialLikes: 0,
          initialComments: [],
        });
      }
      return list;
    }

    if (filter === "posts") {
      return [
        ...orderedCommunity.map((p) => mapCommunityPost(p)),
        ...allPosts.map((post, i) => ({
          kind: "post" as const,
          feedKey: `post-${post.id}`,
          post,
          initialLikes: 14 + i * 6,
          initialComments: [],
        })),
      ];
    }

    // "all" (For You): TikTok/Instagram Reels cadence
    // Optional pinned highlighted post (?post= deep link or newly published post),
    // then 4 videos -> Mentor Discovery (4 cards) -> 5 videos -> Events & Promotions -> repeat
    const deck: FeedEntry[] = [];
    const highlightedNonVideo = highlightedPostId
      ? nonVideoCommunity.find((p) => p.id === highlightedPostId)
      : undefined;

    if (highlightedNonVideo) {
      deck.push(mapCommunityPost(highlightedNonVideo));
    }

    const usedFeedKeys = new Set<string>();
    const pushUniqueVideo = (rawIdx: number) => {
      if (videoPoolCount === 0) return;
      const baseEntry = takeVideoAt(rawIdx);
      if (!baseEntry) return;
      const key = usedFeedKeys.has(baseEntry.feedKey)
        ? `${baseEntry.feedKey}-s${rawIdx}`
        : baseEntry.feedKey;
      usedFeedKeys.add(key);
      deck.push({ ...baseEntry, feedKey: key });
    };

    for (let i = 0; i < 4; i++) {
      pushUniqueVideo(i);
    }

    if (allMentors.length > 0) {
      deck.push({
        kind: "mentor_carousel",
        feedKey: "mentor-discovery-1",
        mentors: allMentors,
      });
    }

    for (let i = 4; i < 9; i++) {
      pushUniqueVideo(i);
    }

    if (events.length > 0) {
      deck.push({
        kind: "events_carousel",
        feedKey: "events-promotions-1",
        events,
      });
    }

    for (const cPost of nonVideoCommunity) {
      if (highlightedNonVideo && cPost.id === highlightedNonVideo.id) continue;
      deck.push(mapCommunityPost(cPost));
    }

    return deck;
  }, [
    activeGoals,
    allMentors,
    allPosts,
    events,
    filter,
    highlightedPostId,
    livePosts,
    pendingRequests,
    reels,
    role,
    upcomingSessions,
  ]);

  // Repeat discovery stream cleanly across cycles so infinite scroll keeps flowing
  const feedItems = useMemo(() => {
    if (filteredBase.length === 0) return [];
    const expanded: Array<FeedEntry & { instanceKey: string; cycle: number }> = [];
    for (let cycle = 0; cycle < feedCycles; cycle++) {
      for (let idx = 0; idx < filteredBase.length; idx++) {
        const entry = filteredBase[idx]!;
        if (entry.kind === "mentor_carousel" && allMentors.length > 0) {
          const offset = (cycle * 4) % allMentors.length;
          const rotated = Array.from(
            { length: allMentors.length },
            (_, k) => allMentors[(offset + k) % allMentors.length]!,
          );
          expanded.push({
            ...entry,
            mentors: rotated,
            instanceKey: `${entry.feedKey}-c${cycle}`,
            cycle,
          });
          continue;
        }
        expanded.push({
          ...entry,
          instanceKey: `${entry.feedKey}-c${cycle}`,
          cycle,
        });
      }
    }
    return expanded;
  }, [allMentors, feedCycles, filteredBase]);

  const displayedItems = useMemo(
    () => feedItems.slice(0, visibleCount),
    [feedItems, visibleCount],
  );

  const videoControllerSignature = useMemo(
    () => displayedItems.map((item) => item.instanceKey).join("|"),
    [displayedItems],
  );

  const {
    autoplayEnabled,
    activeVideoKey,
    feedMuted,
    registerContainer,
    registerVideo,
    handleVideoPlay,
    handleVideoPause,
    triggerManualPlay,
    toggleMute,
  } = useFeedVideoAutoplay(videoControllerSignature);

  // Reset pagination slice cleanly on filter switch
  const handleSelectFilter = useCallback((next: FeedFilter) => {
    setFilter(next);
    setVisibleCount(BATCH_SIZE);
    setFeedCycles(1);
  }, []);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || filteredBase.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((prev) => {
          const next = prev + BATCH_SIZE;
          if (next > feedItems.length) {
            setFeedCycles((c) => Math.min(c + 1, 6));
          }
          return next;
        });
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [feedItems.length, filteredBase.length]);

  const toggleLike = (key: string) => {
    setLikedIds((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(`il_feed_likes_${user.id}`, JSON.stringify(next));
      } catch {
        // Ignore storage failure
      }
      return next;
    });
  };

  const toggleBookmark = (key: string) => {
    setBookmarkedIds((prev) => {
      const nextVal = !prev[key];
      const next = { ...prev, [key]: nextVal };
      try {
        window.localStorage.setItem(`il_feed_bookmarks_${user.id}`, JSON.stringify(next));
      } catch {
        // Ignore storage failure
      }
      pushToast({
        kind: "info",
        title: nextVal ? "Saved to your feed bookmarks" : "Removed from bookmarks",
      });
      return next;
    });
  };

  async function toggleSaveMentor(mentor: PublicMentorSummary) {
    const currentlySaved = Boolean(savedMentorIds[mentor.userId]);
    setSavedMentorIds((prev) => ({ ...prev, [mentor.userId]: !currentlySaved }));
    try {
      const res = await fetch(`/api/v1/mentors/${mentor.userId}/save`, {
        method: currentlySaved ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setSavedMentorIds((prev) => ({ ...prev, [mentor.userId]: currentlySaved }));
        pushToast({ kind: "error", title: "Could not update saved mentor" });
        return;
      }
      pushToast({
        kind: "success",
        title: currentlySaved
          ? `Unfollowed ${mentor.firstName}`
          : `Following ${mentor.firstName}`,
      });
    } catch {
      setSavedMentorIds((prev) => ({ ...prev, [mentor.userId]: currentlySaved }));
    }
  }

  function handleAddComment(feedKey: string, e: React.FormEvent) {
    e.preventDefault();
    const raw = (commentDrafts[feedKey] ?? "").trim();
    if (!raw) return;

    const newComment: FeedComment = {
      id: `u-${Date.now()}`,
      author: `${user.firstName} ${user.lastName}`.trim() || "You",
      text: raw,
      timeLabel: "Just now",
    };

    setUserComments((prev) => {
      const next = {
        ...prev,
        [feedKey]: [...(prev[feedKey] ?? []), newComment],
      };
      try {
        window.localStorage.setItem(`il_feed_comments_${user.id}`, JSON.stringify(next));
      } catch {
        // Ignore storage failure
      }
      return next;
    });

    setCommentDrafts((prev) => ({ ...prev, [feedKey]: "" }));
  }

  async function toggleCommunityPostLike(postId: string) {
    const previous = livePosts;
    setLivePosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.viewerHasLiked;
        return {
          ...p,
          viewerHasLiked: nextLiked,
          likesCount: Math.max(0, p.likesCount + (nextLiked ? 1 : -1)),
        };
      }),
    );

    try {
      const res = await fetch(`/api/v1/posts/${postId}/like`, { method: "POST" });
      const json = (await res.json()) as {
        data?: { liked: boolean; likesCount: number };
      };
      if (!res.ok || !json.data) throw new Error("Failed");

      setLivePosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                viewerHasLiked: json.data!.liked,
                likesCount: json.data!.likesCount,
              }
            : p,
        ),
      );
    } catch {
      setLivePosts(previous);
      pushToast({ kind: "error", title: "Could not update post like" });
    }
  }

  async function submitCommunityPostComment(
    postId: string,
    feedKey: string,
    e: React.FormEvent,
  ) {
    e.preventDefault();
    const content = (commentDrafts[feedKey] ?? "").trim();
    if (!content) return;

    setCommentDrafts((prev) => ({ ...prev, [feedKey]: "" }));

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = (await res.json()) as {
        data?: {
          comment: CommunityPostItem["comments"][number];
          commentsCount: number;
        };
        error?: { message?: string };
      };

      if (!res.ok || !json.data?.comment) {
        setCommentDrafts((prev) => ({ ...prev, [feedKey]: content }));
        pushToast({
          kind: "error",
          title: json.error?.message || "Could not post comment",
        });
        return;
      }

      setLivePosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...p.comments, json.data!.comment],
                commentsCount: json.data!.commentsCount,
              }
            : p,
        ),
      );
    } catch {
      setCommentDrafts((prev) => ({ ...prev, [feedKey]: content }));
      pushToast({ kind: "error", title: "Network error publishing comment" });
    }
  }

  async function editCommunityPostComment(
    postId: string,
    commentId: string,
    newContent: string,
  ): Promise<boolean> {
    const trimmed = newContent.trim();
    if (!trimmed) return false;

    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      const json = (await res.json()) as {
        data?: { comment?: { content: string } };
        error?: { message?: string };
      };
      if (!res.ok) {
        pushToast({
          kind: "error",
          title: json.error?.message || "Could not edit comment",
        });
        return false;
      }

      setLivePosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId
                    ? { ...c, content: json.data?.comment?.content ?? trimmed }
                    : c,
                ),
              }
            : p,
        ),
      );
      pushToast({ kind: "success", title: "Comment updated" });
      return true;
    } catch {
      pushToast({ kind: "error", title: "Network error editing comment" });
      return false;
    }
  }

  async function deleteCommunityPostComment(
    postId: string,
    commentId: string,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/v1/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        data?: { commentsCount?: number };
        error?: { message?: string };
      };
      if (!res.ok) {
        pushToast({
          kind: "error",
          title: json.error?.message || "Could not delete comment",
        });
        return false;
      }

      setLivePosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.filter((c) => c.id !== commentId),
                commentsCount:
                  typeof json.data?.commentsCount === "number"
                    ? json.data.commentsCount
                    : Math.max(0, p.commentsCount - 1),
              }
            : p,
        ),
      );
      pushToast({ kind: "info", title: "Comment deleted" });
      return true;
    } catch {
      pushToast({ kind: "error", title: "Network error deleting comment" });
      return false;
    }
  }

  async function handleShare(title: string, path: string) {
    const shareUrl =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        pushToast({ kind: "success", title: "Link copied to clipboard" });
      }
    } catch {
      // User dismissed share sheet
    }
  }

  async function handleEventRsvp(e: React.FormEvent) {
    e.preventDefault();
    if (!rsvpTarget) return;
    setRsvpError(null);
    setRsvpSubmitting(true);
    try {
      const result = await postJson<{ registered: boolean }>(
        "/api/v1/events/register",
        {
          eventId: rsvpTarget.id,
          attendeeName,
          attendeeEmail,
        },
        "Unable to complete event registration.",
      );
      if (!result.ok) {
        setRsvpError(result.errorMessage ?? "Unable to register.");
        return;
      }
      setRegisteredEventIds((prev) => ({ ...prev, [rsvpTarget.id]: true }));
      pushToast({
        kind: "success",
        title: "Seat reserved!",
        description: `You're registered for ${rsvpTarget.title}.`,
      });
      setRsvpTarget(null);
    } catch {
      setRsvpError("Network error completing registration.");
    } finally {
      setRsvpSubmitting(false);
    }
  }

  const filterChips: Array<{ id: FeedFilter; label: string }> = [
    { id: "all", label: "For You" },
    { id: "mentors", label: role === "mentor" ? "Mentees & Peers" : "Mentors" },
    { id: "reels", label: "Reels" },
    { id: "events", label: "Events & Cohorts" },
    { id: "sessions", label: "My Activity" },
    { id: "posts", label: "Posts" },
  ];

  const renderFilterChipButtons = () =>
    filterChips.map((chip) => {
      const active = filter === chip.id;
      return (
        <button
          key={chip.id}
          type="button"
          onClick={() => handleSelectFilter(chip.id)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
            active
              ? "bg-interlink-forest text-white shadow-subtle"
              : "bg-[#122a1d] text-emerald-100/80 hover:bg-[#193828] hover:text-white"
          }`}
        >
          {chip.label}
        </button>
      );
    });

  return (
    <div className="mx-auto max-w-[680px] space-y-5 pb-4 text-[#edf6f1]">
      {/* Fixed Sliding Category Navigation Bar (slides smoothly with the hidden header) */}
      <div
        data-feed-filter-bar-docked="true"
        data-docked-visible={showDockedFilterBar ? "true" : "false"}
        aria-hidden={!showDockedFilterBar}
        className={`fixed inset-x-0 top-[68px] z-20 bg-[#0a1a12]/95 px-4 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-300 ease-out sm:px-8 ${
          useBottomNav ? "" : "lg:left-64"
        } ${
          showDockedFilterBar
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="no-scrollbar mx-auto flex max-w-[680px] items-center gap-2 overflow-x-auto">
          {renderFilterChipButtons()}
        </div>
      </div>

      {/* Top Story / Discovery Rail (Create Post profile icon first on far left) */}
      <div className="no-scrollbar flex items-center gap-3.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          aria-label="Create Post"
          className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center focus-ring"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/70 via-interlink-gold/60 to-emerald-300/80 p-[2px] shadow-subtle transition-transform group-hover:scale-105">
            <div className="rounded-full bg-[#0a1a12] p-[2px]">
              <UserAvatar
                src={user.profileImage}
                firstName={user.firstName}
                lastName={user.lastName}
                size="md"
                className="border-0"
              />
            </div>
            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-interlink-forest text-white shadow-sm">
              <Plus className="h-3 w-3 stroke-[2.75]" aria-hidden="true" />
            </span>
          </div>
          <span className="w-full truncate text-[11px] font-semibold text-emerald-50">
            Create Post
          </span>
        </button>

        {reels.slice(0, 2).map((reel) => (
            <button
              key={`story-reel-${reel.id}`}
              type="button"
              onClick={() => {
                setVideoError(false);
                setActiveReel(reel);
              }}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center focus-ring"
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-interlink-gold via-emerald-500 to-emerald-300 p-[2px] shadow-subtle transition-transform group-hover:scale-105">
                <div className="relative h-full w-full overflow-hidden rounded-full bg-[#07130d] p-[2px]">
                  <Image
                    src={reel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                    alt={reel.mentorName}
                    fill
                    sizes="56px"
                    className="rounded-full object-cover opacity-90"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>
              </div>
              <span className="w-full truncate text-[11px] font-medium text-emerald-100/90">
                {reel.mentorName.split(" ")[0]}
              </span>
            </button>
          ))}

          {allMentors.slice(0, 8).map((mentor) => (
            <Link
              key={`story-mentor-${mentor.userId}`}
              href={`/mentors/${mentor.userId}`}
              className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center focus-ring"
            >
              <div className="relative rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-300 p-[2px] transition-transform group-hover:scale-105">
                <div className="rounded-full bg-[#0a1a12] p-[2px]">
                  <UserAvatar
                    src={mentor.profileImage}
                    firstName={mentor.firstName}
                    lastName={mentor.lastName}
                    size="md"
                    className="border-0"
                  />
                </div>
                {mentor.availabilityStatus === "accepting" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 shadow-sm" />
                )}
              </div>
              <span className="w-full truncate text-[11px] font-medium text-emerald-100/90">
                {mentor.firstName}
              </span>
            </Link>
          ))}
      </div>

      {/* Inline Category Navigation Bar (scrolls naturally; docked bar slides smoothly below header once scrolled past) */}
      <div
        ref={inlineFilterBarRef}
        data-feed-filter-bar="true"
        className={`no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto bg-[#0a1a12] px-4 py-2 transition-opacity duration-200 sm:mx-0 sm:px-0 ${
          showDockedFilterBar ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {renderFilterChipButtons()}
      </div>

      {/* Empty Filter State */}
      {displayedItems.length === 0 ? (
        <div className="rounded-3xl bg-[#10261b] p-8 text-center shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
          <Sparkles className="mx-auto h-7 w-7 text-emerald-300" />
          <h2 className="mt-3 font-display text-base font-semibold text-white">
            Nothing here yet
          </h2>
          <p className="mt-1 text-xs text-emerald-100/75">
            Explore the full For You stream to discover mentors, reels, and live cohorts.
          </p>
          <button
            type="button"
            onClick={() => handleSelectFilter("all")}
            className="mt-4 rounded-full bg-interlink-forest px-5 py-2 text-xs font-semibold text-white hover:bg-interlink-forest-hover"
          >
            Show All Updates
          </button>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {displayedItems.map((entry, idx) => {
            const isLiked = Boolean(likedIds[entry.feedKey]);
            const isBookmarked = Boolean(bookmarkedIds[entry.feedKey]);
            const baseComments = "initialComments" in entry ? entry.initialComments : [];
            const baseLikes = "initialLikes" in entry ? entry.initialLikes : 0;
            const comments = [...baseComments, ...(userComments[entry.feedKey] ?? [])];
            const likesCount = baseLikes + (isLiked ? 1 : 0);
            const commentsOpen = openCommentKey === entry.instanceKey;

            const showCycleDivider =
              entry.cycle > 0 && idx % filteredBase.length === 0;

            return (
              <React.Fragment key={entry.instanceKey}>
                {showCycleDivider && (
                  <div className="flex items-center gap-3 py-1 text-center">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-200/60">
                      Keep Exploring
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                )}

                {/* HORIZONTALLY SWIPEABLE MENTOR DISCOVERY ROW */}
                {entry.kind === "mentor_carousel" && (
                  <MentorDiscoveryCarousel mentors={entry.mentors} />
                )}

                {/* HORIZONTALLY SWIPEABLE EVENTS & PROMOTIONS ROW */}
                {entry.kind === "events_carousel" && (
                  <EventsPromotionsCarousel
                    events={entry.events}
                    registeredEventIds={registeredEventIds}
                    onSelectInlineRsvp={(ev) => {
                      setRsvpError(null);
                      setRsvpTarget(ev);
                    }}
                  />
                )}

                {/* 0. PUBLIC COMMUNITY POST / RESOURCE CARD */}
                {entry.kind === "community_post" && (() => {
                  const post = entry.post;
                  const isHighlighted = highlightedPostId === post.id;
                  const postComments: FeedComment[] = post.comments.map((c) => ({
                    id: c.id,
                    authorId: c.authorId,
                    author: c.authorName,
                    text: c.content,
                    timeLabel: formatDateTime(c.createdAt),
                  }));

                  if (post.mediaType === "video" && post.mediaUrl) {
                    return (
                      <article
                        id={`post-${post.id}`}
                        className={`-mx-4 overflow-hidden bg-[#07130d] shadow-[0_22px_50px_rgba(0,0,0,0.45)] sm:mx-auto sm:max-w-[460px] sm:rounded-3xl ${
                          isHighlighted ? "ring-2 ring-emerald-400/70" : ""
                        }`}
                      >
                        <FeedCardActionBar
                          liked={post.viewerHasLiked}
                          likesCount={post.likesCount}
                          commentsCount={postComments.length}
                          bookmarked={isBookmarked}
                          onLike={() => void toggleCommunityPostLike(post.id)}
                          onComment={() => setCommentModalInstanceKey(entry.instanceKey)}
                          onBookmark={() => toggleBookmark(entry.feedKey)}
                          onShare={() =>
                            handleShare(post.title || post.authorName, `/dashboard?post=${post.id}`)
                          }
                          likeLabel="Like reel"
                          commentLabel="Comment on reel"
                          bookmarkLabel="Save reel"
                          shareLabel="Share reel"
                        />

                        <div
                          ref={(el) => registerContainer(entry.instanceKey, el)}
                          className="relative h-[calc(100dvh-148px)] min-h-[520px] max-h-[820px] w-full overflow-hidden bg-[#07130d] sm:h-[min(82dvh,760px)]"
                        >
                          <video
                            ref={(el) => registerVideo(entry.instanceKey, el)}
                            src={post.mediaUrl}
                            controls={activeVideoKey === entry.instanceKey}
                            playsInline
                            muted={feedMuted}
                            loop
                            preload="metadata"
                            onPlay={() => handleVideoPlay(entry.instanceKey)}
                            onPause={(e) =>
                              handleVideoPause(entry.instanceKey, e.currentTarget)
                            }
                            className="h-full w-full object-cover"
                          />

                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

                          {/* Top Badges + Sound Toggle */}
                          <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                                <Video className="h-3 w-3 text-emerald-400" />
                                {post.topic}
                              </span>
                              {!autoplayEnabled && (
                                <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                                  Autoplay paused
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={toggleMute}
                              aria-label={feedMuted ? "Unmute videos" : "Mute videos"}
                              className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                            >
                              {feedMuted ? (
                                <VolumeX className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Volume2 className="h-4 w-4" aria-hidden="true" />
                              )}
                            </button>
                          </div>

                          {/* Center Play Trigger when paused */}
                          {activeVideoKey !== entry.instanceKey && (
                            <button
                              type="button"
                              onClick={() => triggerManualPlay(entry.instanceKey)}
                              aria-label={`Play reel: ${post.title || post.authorName}`}
                              className="absolute inset-0 flex items-center justify-center focus-ring"
                            >
                              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-interlink-forest shadow-2xl transition-transform hover:scale-105 active:scale-95">
                                <Play className="ml-0.5 h-7 w-7 fill-current" />
                              </span>
                            </button>
                          )}

                          {/* Bottom Creator Overlay */}
                          <div className="pointer-events-none absolute bottom-12 left-4 right-4 text-white sm:bottom-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold drop-shadow">
                                {post.authorName}
                              </span>
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium capitalize backdrop-blur-sm">
                                {post.postType}
                              </span>
                            </div>
                            {post.title && (
                              <h3 className="mt-1 font-display text-base font-semibold leading-snug drop-shadow">
                                {post.title}
                              </h3>
                            )}
                            <p className="mt-1 line-clamp-2 text-xs text-white/85 drop-shadow">
                              {post.body}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      id={`post-${post.id}`}
                      className={`overflow-hidden rounded-3xl bg-[#10261b] shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition-colors hover:bg-[#132c1f] ${
                        isHighlighted ? "ring-2 ring-emerald-400/70" : ""
                      }`}
                    >
                      <FeedCardActionBar
                        liked={post.viewerHasLiked}
                        likesCount={post.likesCount}
                        commentsCount={post.commentsCount}
                        bookmarked={isBookmarked}
                        onLike={() => void toggleCommunityPostLike(post.id)}
                        onComment={() =>
                          setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                        }
                        onBookmark={() => toggleBookmark(entry.feedKey)}
                        onShare={() =>
                          handleShare(
                            post.title || `Post by ${post.authorName}`,
                            `/dashboard?post=${post.id}`,
                          )
                        }
                      />

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            src={post.authorImage}
                            firstName={post.authorName.split(" ")[0] ?? "M"}
                            lastName={post.authorName.split(" ").slice(1).join(" ")}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {post.authorName}
                            </p>
                            <p className="text-[11px] text-emerald-100/65">
                              {formatDateTime(post.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <Badge tone="forest" className="capitalize">
                            {post.postType}
                          </Badge>
                          <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-100">
                            {post.topic}
                          </span>
                        </div>
                      </div>

                      {post.title && (
                        <h3 className="mt-3.5 font-display text-base font-semibold leading-snug text-white">
                          {post.title}
                        </h3>
                      )}

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-100/85">
                        {post.body}
                      </p>

                      {post.mediaUrl && (
                        <div className="mt-3.5 overflow-hidden rounded-2xl bg-[#0a1911]">
                          {post.mediaType === "image" ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPostMedia({
                                  url: post.mediaUrl!,
                                  kind: "image",
                                  title: post.title || `Post by ${post.authorName}`,
                                })
                              }
                              className="group relative block w-full focus:outline-none"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.mediaUrl}
                                alt={post.title || "Community post image"}
                                className="max-h-96 w-full object-cover transition-transform group-hover:scale-[1.01]"
                              />
                              <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white">
                                <Eye className="h-3 w-3" aria-hidden="true" />
                                Preview
                              </span>
                            </button>
                          ) : post.mediaType === "video" ? (
                            <div
                              ref={(el) => registerContainer(entry.instanceKey, el)}
                              className="relative bg-[#07130d]"
                            >
                              <video
                                ref={(el) => registerVideo(entry.instanceKey, el)}
                                src={post.mediaUrl}
                                controls
                                playsInline
                                muted={feedMuted}
                                loop
                                preload="metadata"
                                onPlay={() => handleVideoPlay(entry.instanceKey)}
                                onPause={(e) =>
                                  handleVideoPause(entry.instanceKey, e.currentTarget)
                                }
                                className="max-h-96 w-full bg-black object-contain"
                              />
                              <div className="pointer-events-none absolute left-3 right-3 top-3 flex items-center justify-between">
                                {!autoplayEnabled ? (
                                  <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                                    Autoplay paused
                                  </span>
                                ) : (
                                  <span />
                                )}
                                <button
                                  type="button"
                                  onClick={toggleMute}
                                  aria-label={feedMuted ? "Unmute videos" : "Mute videos"}
                                  className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                                >
                                  {feedMuted ? (
                                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#163425] p-3.5">
                              <div className="flex items-center gap-2.5 text-xs font-semibold text-white">
                                <FileText className="h-4 w-4 text-emerald-300" />
                                <span>Attached Document</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewPostMedia({
                                      url: post.mediaUrl!,
                                      kind: "document",
                                      title: post.title || "Attached Document",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-full bg-interlink-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-interlink-forest-hover"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </button>
                                <a
                                  href={post.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open document in new tab"
                                  className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5 text-xs text-emerald-100 hover:bg-white/20 hover:text-white"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {post.externalLink && (
                        <a
                          href={post.externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 flex items-center justify-between rounded-2xl bg-[#163425] px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-[#1c412f]"
                        >
                          <span className="truncate">{post.externalLink}</span>
                          <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0" />
                        </a>
                      )}
                      </div>

                      {commentsOpen && (
                        <div>
                          <CommentDrawer
                            comments={postComments}
                            draft={commentDrafts[entry.feedKey] ?? ""}
                            currentUserId={user.id}
                            postAuthorId={post.authorId}
                            variant="embedded"
                            onDraftChange={(val) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [entry.feedKey]: val,
                              }))
                            }
                            onSubmit={(e) =>
                              void submitCommunityPostComment(post.id, entry.feedKey, e)
                            }
                            onEditComment={(commentId, nextContent) =>
                              editCommunityPostComment(post.id, commentId, nextContent)
                            }
                            onDeleteComment={(commentId) =>
                              deleteCommunityPostComment(post.id, commentId)
                            }
                          />
                        </div>
                      )}
                    </article>
                  );
                })()}

                {/* 1. IMMERSIVE REEL CARD (TikTok / IG Reels Full-Screen Vertical Card) */}
                {entry.kind === "reel" && (
                  <article className="-mx-4 overflow-hidden bg-[#07130d] shadow-[0_22px_50px_rgba(0,0,0,0.45)] sm:mx-auto sm:max-w-[460px] sm:rounded-3xl">
                    <FeedCardActionBar
                      liked={isLiked}
                      likesCount={likesCount}
                      commentsCount={comments.length}
                      bookmarked={isBookmarked}
                      onLike={() => toggleLike(entry.feedKey)}
                      onComment={() => setCommentModalInstanceKey(entry.instanceKey)}
                      onBookmark={() => toggleBookmark(entry.feedKey)}
                      onShare={() => handleShare(entry.reel.title, "/learn")}
                      likeLabel="Like reel"
                      commentLabel="Comment on reel"
                      bookmarkLabel="Save reel"
                      shareLabel="Share reel"
                      trailing={
                        <>
                          <Link
                            href={entry.reel.mentorId ? `/mentors/${entry.reel.mentorId}` : "/mentors"}
                            className="rounded-full bg-interlink-forest/90 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest"
                          >
                            {entry.reel.mentorId ? "View Mentor" : "Browse Mentors"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setVideoError(false);
                              setActiveReel(entry.reel);
                            }}
                            className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                          >
                            Takeaway
                          </button>
                        </>
                      }
                    />

                    <div
                      ref={(el) => registerContainer(entry.instanceKey, el)}
                      className="relative h-[calc(100dvh-148px)] min-h-[520px] max-h-[820px] w-full overflow-hidden bg-[#07130d] sm:h-[min(82dvh,760px)]"
                    >
                      <video
                        ref={(el) => registerVideo(entry.instanceKey, el)}
                        src={entry.reel.videoUrl}
                        poster={entry.reel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                        controls={activeVideoKey === entry.instanceKey}
                        playsInline
                        muted={feedMuted}
                        loop
                        preload="metadata"
                        onPlay={() => handleVideoPlay(entry.instanceKey)}
                        onPause={(e) =>
                          handleVideoPause(entry.instanceKey, e.currentTarget)
                        }
                        className="h-full w-full object-cover"
                      />

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

                      {/* Top Badges + Sound Toggle */}
                      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                            <Video className="h-3 w-3 text-emerald-400" />
                            {entry.reel.topicTag}
                          </span>
                          {!autoplayEnabled && (
                            <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                              Autoplay paused
                            </span>
                          )}
                        </div>
                        <div className="pointer-events-auto flex items-center gap-2">
                          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                            {entry.reel.durationLabel}
                          </span>
                          <button
                            type="button"
                            onClick={toggleMute}
                            aria-label={feedMuted ? "Unmute videos" : "Mute videos"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                          >
                            {feedMuted ? (
                              <VolumeX className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Volume2 className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Center Play Trigger when paused */}
                      {activeVideoKey !== entry.instanceKey && (
                        <button
                          type="button"
                          onClick={() => triggerManualPlay(entry.instanceKey)}
                          aria-label={`Play reel: ${entry.reel.title}`}
                          className="absolute inset-0 flex items-center justify-center focus-ring"
                        >
                          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-interlink-forest shadow-2xl transition-transform hover:scale-105 active:scale-95">
                            <Play className="ml-0.5 h-7 w-7 fill-current" />
                          </span>
                        </button>
                      )}

                      {/* Bottom Creator Overlay */}
                      <div className="pointer-events-none absolute bottom-12 left-4 right-4 text-white sm:bottom-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold drop-shadow">{entry.reel.mentorName}</span>
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                            {entry.reel.profession}
                          </span>
                        </div>
                        <h3 className="mt-1 font-display text-base font-semibold leading-snug drop-shadow">
                          {entry.reel.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/85 drop-shadow">
                          <Route className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate">{entry.reel.careerPath}</span>
                        </p>
                      </div>
                    </div>
                  </article>
                )}

                {/* 2. CREATOR MENTOR SPOTLIGHT CARD (Instagram Creator Card) */}
                {entry.kind === "mentor" && (() => {
                  const isSavedMentor = Boolean(savedMentorIds[entry.mentor.userId]);
                  const isFull =
                    entry.mentor.availabilityStatus !== "accepting" ||
                    entry.mentor.activeMenteeCount >= entry.mentor.maximumMentees;

                  return (
                    <article className="overflow-hidden rounded-3xl bg-[#10261b] shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition-colors hover:bg-[#132c1f]">
                      <FeedCardActionBar
                        liked={isLiked}
                        likesCount={likesCount}
                        commentsCount={comments.length}
                        bookmarked={isBookmarked}
                        onLike={() => toggleLike(entry.feedKey)}
                        onComment={() =>
                          setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                        }
                        onBookmark={() => toggleBookmark(entry.feedKey)}
                        onShare={() =>
                          handleShare(
                            `${entry.mentor.firstName} ${entry.mentor.lastName} on Interlink`,
                            `/mentors/${entry.mentor.userId}`,
                          )
                        }
                        likeLabel="Like mentor card"
                        commentLabel="Discuss mentor"
                        shareLabel="Share mentor profile"
                        trailing={
                          <>
                            <Link
                              href={`/mentors/${entry.mentor.userId}`}
                              className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/20"
                            >
                              Profile
                            </Link>
                            <Link
                              href={`/mentors/${entry.mentor.userId}#request`}
                              className="rounded-full bg-interlink-forest px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                            >
                              Connect
                            </Link>
                          </>
                        }
                      />

                      {/* Post Header */}
                      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                        <Link
                          href={`/mentors/${entry.mentor.userId}`}
                          className="flex min-w-0 items-center gap-3"
                        >
                          <div className="relative shrink-0">
                            <UserAvatar
                              src={entry.mentor.profileImage}
                              firstName={entry.mentor.firstName}
                              lastName={entry.mentor.lastName}
                              size="md"
                            />
                            {!isFull && (
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 shadow-sm" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-white">
                                {entry.mentor.firstName} {entry.mentor.lastName}
                              </span>
                              {entry.mentor.verificationStatus === "verified" && (
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                              )}
                            </div>
                            <p className="truncate text-xs text-emerald-100/70">
                              {entry.mentor.currentPosition}
                              {entry.mentor.organisation ? ` · ${entry.mentor.organisation}` : ""}
                            </p>
                          </div>
                        </Link>

                        <button
                          type="button"
                          onClick={() => void toggleSaveMentor(entry.mentor)}
                          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                            isSavedMentor
                              ? "bg-white/10 text-emerald-100 hover:bg-white/15"
                              : "bg-interlink-forest text-white hover:bg-interlink-forest-hover"
                          }`}
                        >
                          {isSavedMentor ? "Following" : "Follow"}
                        </button>
                      </div>

                      {/* Visual Creator Spotlight Body */}
                      <div className="mx-4 mb-4 rounded-2xl bg-[#163425] p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {typeof entry.mentor.matchScore === "number" && entry.mentor.matchScore > 0 && (
                            <Badge tone="forest">{entry.mentor.matchScore}% Match</Badge>
                          )}
                          {entry.mentor.industryName && (
                            <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-100">
                              {entry.mentor.industryName}
                            </span>
                          )}
                          <span className="text-[11px] font-medium text-emerald-100/70">
                            {entry.mentor.yearsOfExperience}+ yrs exp
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-emerald-50/90">
                          {entry.mentor.biography}
                        </p>

                        {entry.mentor.expertiseTags.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-1.5">
                            {entry.mentor.expertiseTags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[#1d422f] px-2.5 py-0.5 text-[11px] font-medium text-emerald-100"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {commentsOpen && (
                        <CommentDrawer
                          comments={comments}
                          draft={commentDrafts[entry.feedKey] ?? ""}
                          variant="embedded"
                          onDraftChange={(val) =>
                            setCommentDrafts((prev) => ({ ...prev, [entry.feedKey]: val }))
                          }
                          onSubmit={(e) => handleAddComment(entry.feedKey, e)}
                        />
                      )}
                    </article>
                  );
                })()}

                {/* 3. EVENT & FELLOWSHIP COHORT CARD (Media-First Card) */}
                {entry.kind === "event" && (() => {
                  const isRegistered = Boolean(
                    registeredEventIds[entry.event.id] || entry.event.isRegistered,
                  );
                  const hasMore = hasExtendedEventDetails(entry.event);

                  return (
                    <article className="overflow-hidden rounded-3xl bg-[#10261b] shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition-colors hover:bg-[#132c1f]">
                      <FeedCardActionBar
                        liked={isLiked}
                        likesCount={likesCount}
                        commentsCount={comments.length}
                        bookmarked={isBookmarked}
                        onLike={() => toggleLike(entry.feedKey)}
                        onComment={() =>
                          setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                        }
                        onBookmark={() => toggleBookmark(entry.feedKey)}
                        onShare={() => handleShare(entry.event.title, "/learn")}
                        likeLabel="Like event"
                        commentLabel="Comment on event"
                        shareLabel="Share event"
                        trailing={
                          isRegistered ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Reserved
                            </span>
                          ) : hasMore ? (
                            <Link
                              href={`/events/${entry.event.id}`}
                              className="rounded-full bg-interlink-forest px-3.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                            >
                              View Details
                            </Link>
                          ) : entry.event.ctaUrl ? (
                            <Link
                              href={entry.event.ctaUrl}
                              className="rounded-full bg-interlink-forest px-3.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                            >
                              {entry.event.ctaLabel}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setRsvpError(null);
                                setRsvpTarget(entry.event);
                              }}
                              className="rounded-full bg-interlink-forest px-3.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                            >
                              {entry.event.ctaLabel}
                            </button>
                          )
                        }
                      />

                      {hasMore ? (
                        <Link href={`/events/${entry.event.id}`} className="group block">
                          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a1911]">
                            <Image
                              src={entry.event.imageUrl || "/images/workshop-collaboration.jpg"}
                              alt={entry.event.title}
                              fill
                              sizes="(max-width: 680px) 100vw, 680px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#10261b] via-black/20 to-transparent" />
                            <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                              <span className="rounded-full bg-interlink-forest/95 px-3 py-1 text-[11px] font-semibold capitalize text-white backdrop-blur-md">
                                {entry.event.category === "opportunity" ? "Cohort" : entry.event.category}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                                <Users className="h-3 w-3 text-emerald-400" />
                                {(entry.event.registrationCount ?? 0) + (isRegistered ? 1 : 0)} going
                              </span>
                            </div>
                            <div className="absolute bottom-3.5 left-4 right-4 text-white">
                              <h3 className="font-display text-lg font-semibold leading-snug">
                                {entry.event.title}
                              </h3>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#0a1911]">
                          <Image
                            src={entry.event.imageUrl || "/images/workshop-collaboration.jpg"}
                            alt={entry.event.title}
                            fill
                            sizes="(max-width: 680px) 100vw, 680px"
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#10261b] via-black/20 to-transparent" />
                          <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                            <span className="rounded-full bg-interlink-forest/95 px-3 py-1 text-[11px] font-semibold capitalize text-white backdrop-blur-md">
                              {entry.event.category === "opportunity" ? "Cohort" : entry.event.category}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                              <Users className="h-3 w-3 text-emerald-400" />
                              {(entry.event.registrationCount ?? 0) + (isRegistered ? 1 : 0)} going
                            </span>
                          </div>
                          <div className="absolute bottom-3.5 left-4 right-4 text-white">
                            <h3 className="font-display text-lg font-semibold leading-snug">
                              {entry.event.title}
                            </h3>
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/70">
                          {entry.event.eventDate && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                              {new Date(entry.event.eventDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                            {entry.event.locationOrFormat}
                          </span>
                        </div>

                        <p
                          className={`mt-2.5 text-sm leading-relaxed text-emerald-100/85 ${
                            hasMore ? "line-clamp-2" : ""
                          }`}
                        >
                          {entry.event.summary}
                        </p>
                      </div>

                      {commentsOpen && (
                        <CommentDrawer
                          comments={comments}
                          draft={commentDrafts[entry.feedKey] ?? ""}
                          variant="embedded"
                          onDraftChange={(val) =>
                            setCommentDrafts((prev) => ({ ...prev, [entry.feedKey]: val }))
                          }
                          onSubmit={(e) => handleAddComment(entry.feedKey, e)}
                        />
                      )}
                    </article>
                  );
                })()}

                {/* 4. LIVE SESSION PULSE CARD */}
                {entry.kind === "session" && (
                  <article className="rounded-3xl bg-[#10261b] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          src={entry.session.partnerImage}
                          firstName={entry.session.partnerName}
                          lastName=""
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                            <Calendar className="h-3 w-3" /> Upcoming Session
                          </span>
                          <h3 className="truncate font-display text-base font-semibold text-white">
                            {entry.session.title}
                          </h3>
                          <p className="truncate text-xs text-emerald-100/70">
                            with {entry.session.partnerName} &middot;{" "}
                            {new Date(entry.session.startTime).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/mentorships/${entry.session.mentorshipId}`}
                        className="shrink-0 rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
                      >
                        Open
                      </Link>
                    </div>
                  </article>
                )}

                {/* 5. MENTOR INCOMING REQUEST CARD */}
                {entry.kind === "request" && (
                  <article className="rounded-3xl bg-[#10261b] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          src={entry.request.menteeImage}
                          firstName={entry.request.menteeName}
                          lastName=""
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-interlink-gold">
                            Mentee Request
                          </span>
                          <h3 className="truncate text-sm font-semibold text-white">
                            {entry.request.menteeName} wants to connect
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-xs text-emerald-100/70">
                            {entry.request.careerObjective}
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/requests"
                        className="shrink-0 rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                      >
                        Review
                      </Link>
                    </div>
                  </article>
                )}

                {/* 6. GOAL MILESTONE CHECK-IN CARD */}
                {entry.kind === "goal" && (
                  <article className="rounded-3xl bg-[#10261b] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.32)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                            Active Goal
                          </p>
                          <h3 className="truncate text-sm font-semibold text-white">
                            {entry.goal.title}
                          </h3>
                        </div>
                      </div>
                      <Link
                        href={`/mentorships/${entry.goal.mentorshipId}`}
                        className="shrink-0 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        Track
                      </Link>
                    </div>
                  </article>
                )}

                {/* 7. COMMUNITY POST / DISCUSSION CARD (X / Threads Style) */}
                {entry.kind === "post" && (
                  <article className="overflow-hidden rounded-3xl bg-[#10261b] shadow-[0_14px_34px_rgba(0,0,0,0.32)] transition-colors hover:bg-[#132c1f]">
                    <FeedCardActionBar
                      liked={isLiked}
                      likesCount={likesCount}
                      commentsCount={comments.length}
                      bookmarked={isBookmarked}
                      onLike={() => toggleLike(entry.feedKey)}
                      onComment={() =>
                        setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                      }
                      onBookmark={() => toggleBookmark(entry.feedKey)}
                      onShare={() => handleShare(entry.post.title, entry.post.href)}
                      trailing={
                        <Link
                          href={entry.post.href}
                          className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-interlink-forest hover:text-white"
                        >
                          {entry.post.ctaLabel} &rarr;
                        </Link>
                      }
                    />

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                            <Compass className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {entry.post.authorName}
                            </p>
                            <p className="text-[11px] text-emerald-100/65">{entry.post.authorRole}</p>
                          </div>
                        </div>
                        <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-100">
                          {entry.post.topic}
                        </span>
                      </div>

                      <h3 className="mt-3.5 font-display text-base font-semibold leading-snug text-white">
                        {entry.post.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-emerald-100/75">
                        {entry.post.body}
                      </p>
                    </div>

                    {commentsOpen && (
                      <CommentDrawer
                        comments={comments}
                        draft={commentDrafts[entry.feedKey] ?? ""}
                        variant="embedded"
                        onDraftChange={(val) =>
                          setCommentDrafts((prev) => ({ ...prev, [entry.feedKey]: val }))
                        }
                        onSubmit={(e) => handleAddComment(entry.feedKey, e)}
                      />
                    )}
                  </article>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {filteredBase.length > 0 && (
        <div ref={loadMoreRef} className="flex flex-col items-center py-6 text-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-300/25 border-t-emerald-300" />
          <p className="mt-2 text-[11px] font-medium text-emerald-100/70">
            Loading more stories &amp; opportunities...
          </p>
        </div>
      )}

      {/* Full Reel Player Modal */}
      <Modal
        open={Boolean(activeReel)}
        onClose={() => setActiveReel(null)}
        title={activeReel?.title ?? "Mentor Reel"}
        maxWidthClass="max-w-[700px]"
        containerClassName="overflow-hidden rounded-3xl border border-interlink-border bg-interlink-surface shadow-modal"
        hideCloseButton
      >
        {activeReel && (
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-interlink-border px-5 py-4">
              <div className="min-w-0">
                <Badge tone="forest">{activeReel.topicTag}</Badge>
                <h3 className="mt-2 font-display text-lg font-semibold text-interlink-ink">
                  {activeReel.title}
                </h3>
                <p className="text-xs text-interlink-muted">
                  {activeReel.mentorName} &middot; {activeReel.profession}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReel(null)}
                aria-label="Close reel"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-interlink-border text-interlink-muted hover:text-interlink-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-2xl bg-black">
                {!videoError ? (
                  <video
                    key={activeReel.id}
                    src={activeReel.videoUrl}
                    poster={activeReel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                    controls
                    autoPlay
                    playsInline
                    onError={() => setVideoError(true)}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center text-sm text-white/80">
                    {activeReel.summary}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-interlink-app-bg p-4 text-xs leading-relaxed text-interlink-ink">
                <p className="font-semibold text-interlink-forest">Career Path</p>
                <p className="mt-1">{activeReel.careerPath}</p>
                <p className="mt-3 font-semibold text-interlink-forest">Key Takeaway</p>
                <p className="mt-1 text-interlink-muted">{activeReel.summary}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Event Reservation Modal */}
      <Modal
        open={Boolean(rsvpTarget)}
        onClose={() => setRsvpTarget(null)}
        title={rsvpTarget ? `Reserve: ${rsvpTarget.title}` : "Reserve Seat"}
        maxWidthClass="max-w-[460px]"
        containerClassName="overflow-hidden rounded-3xl border border-interlink-border bg-interlink-surface shadow-modal"
      >
        {rsvpTarget && (
          <form onSubmit={handleEventRsvp} className="space-y-4 p-6">
            <div>
              <Badge tone="forest" className="capitalize">
                {rsvpTarget.category}
              </Badge>
              <h3 className="mt-2 font-display text-lg font-semibold text-interlink-ink">
                {rsvpTarget.title}
              </h3>
              <p className="mt-1 text-xs text-interlink-muted">{rsvpTarget.locationOrFormat}</p>
            </div>

            {rsvpError && <ErrorAlert message={rsvpError} />}

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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRsvpTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={rsvpSubmitting}>
                Confirm Seat
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Floating Bottom-Right "+" Button (hidden at top, appears on scroll down) */}
      <button
        type="button"
        data-floating-create="true"
        onClick={() => setCreateModalOpen(true)}
        aria-label="Create Post or Reel"
        aria-hidden={!showFloatingCreate}
        tabIndex={showFloatingCreate ? 0 : -1}
        className={`fixed right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-interlink-forest text-white shadow-[0_12px_28px_rgba(0,0,0,0.42)] transition-all duration-300 ease-out hover:bg-interlink-forest-hover active:scale-95 focus-ring sm:right-6 ${
          useBottomNav
            ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
            : "bottom-6 sm:bottom-8"
        } ${
          showFloatingCreate && !createModalOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-90 opacity-0"
        }`}
      >
        <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
      </button>

      {/* Create Community Post Modal */}
      <CreatePostModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={(createdPost) => {
          setLivePosts((prev) => [createdPost, ...prev]);
          setFilter("all");
          setHighlightedPostId(createdPost.id);
        }}
      />

      {/* Community Post Attachment Preview Modal */}
      <Modal
        open={Boolean(previewPostMedia)}
        onClose={() => setPreviewPostMedia(null)}
        title={previewPostMedia?.title ?? "Attachment Preview"}
        maxWidthClass="max-w-3xl"
      >
        {previewPostMedia?.kind === "image" && (
          <div className="flex max-h-[75vh] justify-center overflow-auto rounded-2xl bg-black/5 p-2 dark:bg-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPostMedia.url}
              alt={previewPostMedia.title}
              className="max-h-[70vh] rounded-xl object-contain"
            />
          </div>
        )}

        {previewPostMedia?.kind === "document" && (
          <div className="overflow-hidden rounded-2xl border border-interlink-border bg-white dark:border-white/10">
            <iframe
              src={previewPostMedia.url}
              title={previewPostMedia.title}
              className="h-[70vh] w-full"
            />
          </div>
        )}

        {previewPostMedia && (
          <div className="mt-4 flex justify-end gap-2">
            <a
              href={previewPostMedia.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-interlink-border px-4 text-sm font-medium text-interlink-ink hover:bg-interlink-app-bg"
            >
              Open in new tab
            </a>
            <Button type="button" onClick={() => setPreviewPostMedia(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* Comment Drawer Sheet Modal for Full-Screen Vertical Videos */}
      {(() => {
        const modalEntry = commentModalInstanceKey
          ? displayedItems.find((item) => item.instanceKey === commentModalInstanceKey)
          : undefined;

        const isCommunity = modalEntry?.kind === "community_post";
        const isReel = modalEntry?.kind === "reel";
        const modalComments: FeedComment[] = isCommunity
          ? modalEntry.post.comments.map((c) => ({
              id: c.id,
              authorId: c.authorId,
              author: c.authorName,
              text: c.content,
              timeLabel: formatDateTime(c.createdAt),
            }))
          : modalEntry && "initialComments" in modalEntry
            ? [...modalEntry.initialComments, ...(userComments[modalEntry.feedKey] ?? [])]
            : [];

        const modalTitle = isCommunity
          ? modalEntry.post.title || `Comments on ${modalEntry.post.authorName}'s post`
          : isReel
            ? modalEntry.reel.title
            : "Comments";

        return (
          <Modal
            open={Boolean(modalEntry)}
            onClose={() => setCommentModalInstanceKey(null)}
            title={modalTitle}
            maxWidthClass="max-w-lg"
          >
            {modalEntry && (
              <div className="-mx-5 -mb-5 mt-1">
                <CommentDrawer
                  comments={modalComments}
                  draft={commentDrafts[modalEntry.feedKey] ?? ""}
                  currentUserId={isCommunity ? user.id : undefined}
                  postAuthorId={isCommunity ? modalEntry.post.authorId : undefined}
                  onDraftChange={(val) =>
                    setCommentDrafts((prev) => ({ ...prev, [modalEntry.feedKey]: val }))
                  }
                  onSubmit={(e) => {
                    if (isCommunity) {
                      void submitCommunityPostComment(modalEntry.post.id, modalEntry.feedKey, e);
                    } else {
                      handleAddComment(modalEntry.feedKey, e);
                    }
                  }}
                  onEditComment={
                    isCommunity
                      ? (commentId, nextContent) =>
                          editCommunityPostComment(modalEntry.post.id, commentId, nextContent)
                      : undefined
                  }
                  onDeleteComment={
                    isCommunity
                      ? (commentId) =>
                          deleteCommunityPostComment(modalEntry.post.id, commentId)
                      : undefined
                  }
                />
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}

function CommentDrawer({
  comments,
  draft,
  currentUserId,
  postAuthorId,
  variant = "modal",
  onDraftChange,
  onSubmit,
  onEditComment,
  onDeleteComment,
}: {
  comments: FeedComment[];
  draft: string;
  currentUserId?: string;
  postAuthorId?: string;
  variant?: "modal" | "embedded";
  onDraftChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onEditComment?: (commentId: string, newContent: string) => Promise<boolean>;
  onDeleteComment?: (commentId: string) => Promise<boolean>;
}) {
  const isEmbedded = variant === "embedded";
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function saveEdit(commentId: string) {
    if (!onEditComment) return;
    setBusyId(commentId);
    try {
      const ok = await onEditComment(commentId, editingText);
      if (ok) {
        setEditingId(null);
        setEditingText("");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeComment(commentId: string) {
    if (!onDeleteComment) return;
    setBusyId(commentId);
    try {
      await onDeleteComment(commentId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className={
        isEmbedded
          ? "bg-[#0d2016] px-4 py-3.5 text-emerald-50"
          : "border-t border-interlink-border/60 bg-interlink-app-bg/50 px-4 py-3.5"
      }
    >
      {comments.length > 0 ? (
        <ul className="mb-3 space-y-2.5">
          {comments.map((comment) => {
            const isCommentAuthor = Boolean(
              currentUserId && comment.authorId && comment.authorId === currentUserId,
            );
            const isPostAuthor = Boolean(
              currentUserId && postAuthorId && postAuthorId === currentUserId,
            );
            const canEdit = Boolean(onEditComment && isCommentAuthor);
            const canDelete = Boolean(
              onDeleteComment && (isCommentAuthor || isPostAuthor),
            );
            const isEditing = editingId === comment.id;

            return (
              <li key={comment.id} className="text-xs leading-relaxed">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      aria-label="Edit comment"
                      className={
                        isEmbedded
                          ? "min-w-0 flex-1 rounded-full bg-[#163425] px-3 py-1.5 text-xs text-white placeholder:text-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                          : "min-w-0 flex-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1.5 text-xs text-interlink-ink focus:border-interlink-forest focus:outline-none"
                      }
                    />
                    <button
                      type="button"
                      disabled={busyId === comment.id || !editingText.trim()}
                      onClick={() => void saveEdit(comment.id)}
                      aria-label="Save edited comment"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-interlink-forest text-white disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditingText("");
                      }}
                      aria-label="Cancel comment edit"
                      className={
                        isEmbedded
                          ? "inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-emerald-100 hover:text-white"
                          : "inline-flex h-7 w-7 items-center justify-center rounded-full border border-interlink-border text-interlink-muted hover:text-interlink-ink"
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className={
                          isEmbedded ? "font-semibold text-white" : "font-semibold text-interlink-ink"
                        }
                      >
                        {comment.author}
                      </span>{" "}
                      <span className={isEmbedded ? "text-emerald-100/85" : "text-interlink-ink/85"}>
                        {comment.text}
                      </span>
                      <span
                        className={
                          isEmbedded
                            ? "ml-2 text-[10px] text-emerald-100/55"
                            : "ml-2 text-[10px] text-interlink-muted"
                        }
                      >
                        {comment.timeLabel}
                      </span>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="flex shrink-0 items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            disabled={busyId === comment.id}
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditingText(comment.text);
                            }}
                            aria-label="Edit comment"
                            className={
                              isEmbedded
                                ? "rounded p-1 text-emerald-100/65 hover:text-emerald-300"
                                : "rounded p-1 text-interlink-muted hover:text-interlink-forest"
                            }
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={busyId === comment.id}
                            onClick={() => void removeComment(comment.id)}
                            aria-label="Delete comment"
                            className={
                              isEmbedded
                                ? "rounded p-1 text-emerald-100/65 hover:text-rose-400"
                                : "rounded p-1 text-interlink-muted hover:text-red-600"
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={isEmbedded ? "mb-3 text-xs text-emerald-100/65" : "mb-3 text-xs text-interlink-muted"}>
          Be the first to share a note or question.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          className={
            isEmbedded
              ? "w-full min-w-0 rounded-full bg-[#163425] px-3.5 py-2 text-base text-white placeholder:text-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 sm:text-xs"
              : "w-full min-w-0 rounded-full border border-interlink-border bg-interlink-surface px-3.5 py-2 text-base text-interlink-ink placeholder:text-interlink-muted focus:border-interlink-forest focus:outline-none sm:text-xs"
          }
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send comment"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-interlink-forest text-white transition-opacity disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
