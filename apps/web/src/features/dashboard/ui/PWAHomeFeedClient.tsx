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
import { useFeedVideoAutoplay } from "@/features/dashboard/ui/useFeedVideoAutoplay";
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

const BATCH_SIZE = 6;

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
  const [livePosts, setLivePosts] = useState<CommunityPostItem[]>(communityPosts);
  const [createModalOpen, setCreateModalOpen] = useState(false);
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

  // Build rich interleaved base feed deck (community posts first, then varied media, creators, events, sessions)
  const baseDeck = useMemo<FeedEntry[]>(() => {
    const deck: FeedEntry[] = [];

    // Highlighted deep-linked post (if any) + newest community posts appear right at the top
    const orderedCommunity = [...livePosts].sort((a, b) => {
      if (highlightedPostId && a.id === highlightedPostId) return -1;
      if (highlightedPostId && b.id === highlightedPostId) return 1;
      return 0;
    });

    const maxLen = Math.max(
      orderedCommunity.length,
      reels.length,
      allMentors.length,
      events.length,
      allPosts.length,
      upcomingSessions.length,
      pendingRequests.length,
      activeGoals.length,
      1,
    );

    for (let i = 0; i < maxLen; i++) {
      if (i < pendingRequests.length && role === "mentor") {
        const req = pendingRequests[i]!;
        deck.push({
          kind: "request",
          feedKey: `req-${req.id}`,
          request: req,
          initialLikes: 0,
          initialComments: [],
        });
      }

      if (i < orderedCommunity.length) {
        const cPost = orderedCommunity[i]!;
        deck.push({
          kind: "community_post",
          feedKey: `community-${cPost.id}`,
          post: cPost,
          initialLikes: cPost.likesCount,
          initialComments: cPost.comments.map((c) => ({
            id: c.id,
            author: c.authorName,
            text: c.content,
            timeLabel: formatDateTime(c.createdAt),
          })),
        });
      }

      if (i < reels.length) {
        const reel = reels[i]!;
        deck.push({
          kind: "reel",
          feedKey: `reel-${reel.id}`,
          reel,
          initialLikes: 28 + i * 11,
          initialComments: [
            {
              id: `seed-r-${i}`,
              author: "Community Member",
              text: `The "${reel.careerPath}" breakdown makes this path much clearer.`,
              timeLabel: "2h ago",
            },
          ],
        });
      }

      if (i < upcomingSessions.length) {
        const session = upcomingSessions[i]!;
        deck.push({
          kind: "session",
          feedKey: `session-${session.id}`,
          session,
          initialLikes: 0,
          initialComments: [],
        });
      }

      if (i < allMentors.length) {
        const mentor = allMentors[i]!;
        deck.push({
          kind: "mentor",
          feedKey: `mentor-${mentor.userId}`,
          mentor,
          initialLikes: 19 + i * 7,
          initialComments: [],
        });
      }

      if (i < events.length) {
        const event = events[i]!;
        deck.push({
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
        });
      }

      if (i < activeGoals.length) {
        const goal = activeGoals[i]!;
        deck.push({
          kind: "goal",
          feedKey: `goal-${goal.id}`,
          goal,
          initialLikes: 0,
          initialComments: [],
        });
      }

      if (i < allPosts.length) {
        const post = allPosts[i]!;
        deck.push({
          kind: "post",
          feedKey: `post-${post.id}`,
          post,
          initialLikes: 14 + i * 6,
          initialComments: [],
        });
      }
    }

    return deck;
  }, [
    activeGoals,
    allMentors,
    allPosts,
    events,
    highlightedPostId,
    livePosts,
    pendingRequests,
    reels,
    role,
    upcomingSessions,
  ]);

  const filteredBase = useMemo(() => {
    if (filter === "all") return baseDeck;
    if (filter === "mentors") return baseDeck.filter((e) => e.kind === "mentor" || e.kind === "request");
    if (filter === "reels") return baseDeck.filter((e) => e.kind === "reel");
    if (filter === "events") return baseDeck.filter((e) => e.kind === "event");
    if (filter === "sessions") return baseDeck.filter((e) => e.kind === "session" || e.kind === "goal");
    return baseDeck.filter((e) => e.kind === "community_post" || e.kind === "post");
  }, [baseDeck, filter]);

  // Repeat discovery stream cleanly across cycles so infinite scroll keeps flowing
  const feedItems = useMemo(() => {
    if (filteredBase.length === 0) return [];
    const expanded: Array<FeedEntry & { instanceKey: string; cycle: number }> = [];
    for (let cycle = 0; cycle < feedCycles; cycle++) {
      for (let idx = 0; idx < filteredBase.length; idx++) {
        const entry = filteredBase[idx]!;
        expanded.push({
          ...entry,
          instanceKey: `${entry.feedKey}-c${cycle}`,
          cycle,
        });
      }
    }
    return expanded;
  }, [feedCycles, filteredBase]);

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

  return (
    <div className="mx-auto max-w-[680px] space-y-5">
      {/* Top Story / Discovery Rail (Create Post profile icon first on far left) */}
      <div className="no-scrollbar flex items-center gap-3.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          aria-label="Create Post"
          className="group flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center focus-ring"
        >
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-interlink-forest/30 via-interlink-gold/40 to-emerald-400/50 p-[2px] shadow-subtle transition-transform group-hover:scale-105">
            <div className="rounded-full border-2 border-interlink-surface bg-interlink-surface">
              <UserAvatar
                src={user.profileImage}
                firstName={user.firstName}
                lastName={user.lastName}
                size="md"
                className="border-0"
              />
            </div>
            <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-interlink-surface bg-interlink-forest text-white shadow-sm">
              <Plus className="h-3 w-3 stroke-[2.75]" aria-hidden="true" />
            </span>
          </div>
          <span className="w-full truncate text-[11px] font-semibold text-interlink-ink">
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
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-interlink-gold via-interlink-forest to-emerald-400 p-[2px] shadow-subtle transition-transform group-hover:scale-105">
                <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-interlink-surface bg-black">
                  <Image
                    src={reel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                    alt={reel.mentorName}
                    fill
                    sizes="56px"
                    className="object-cover opacity-90"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>
              </div>
              <span className="w-full truncate text-[11px] font-medium text-interlink-ink">
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
              <div className="relative rounded-full bg-gradient-to-tr from-interlink-forest to-emerald-400 p-[2px] transition-transform group-hover:scale-105">
                <div className="rounded-full border-2 border-interlink-surface bg-interlink-surface">
                  <UserAvatar
                    src={mentor.profileImage}
                    firstName={mentor.firstName}
                    lastName={mentor.lastName}
                    size="md"
                    className="border-0"
                  />
                </div>
                {mentor.availabilityStatus === "accepting" && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-interlink-surface bg-emerald-500" />
                )}
              </div>
              <span className="w-full truncate text-[11px] font-medium text-interlink-ink">
                {mentor.firstName}
              </span>
            </Link>
          ))}
      </div>

      {/* Sticky Feed Category Filter Pills */}
      <div className="no-scrollbar sticky top-[68px] z-10 -mx-4 flex items-center gap-2 overflow-x-auto bg-interlink-app-bg/92 px-4 py-2.5 backdrop-blur-md sm:mx-0 sm:px-0">
        {filterChips.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSelectFilter(chip.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] ${
                active
                  ? "bg-interlink-forest text-white shadow-subtle"
                  : "border border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest/50 hover:text-interlink-ink"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Empty Filter State */}
      {displayedItems.length === 0 ? (
        <div className="rounded-3xl border border-interlink-border bg-interlink-surface p-8 text-center shadow-subtle">
          <Sparkles className="mx-auto h-7 w-7 text-interlink-forest" />
          <h2 className="mt-3 font-display text-base font-semibold text-interlink-ink">
            Nothing here yet
          </h2>
          <p className="mt-1 text-xs text-interlink-muted">
            Explore the full For You stream to discover mentors, reels, and live cohorts.
          </p>
          <button
            type="button"
            onClick={() => handleSelectFilter("all")}
            className="mt-4 rounded-full bg-interlink-forest px-5 py-2 text-xs font-semibold text-white"
          >
            Show All Updates
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedItems.map((entry, idx) => {
            const isLiked = Boolean(likedIds[entry.feedKey]);
            const isBookmarked = Boolean(bookmarkedIds[entry.feedKey]);
            const comments = [...entry.initialComments, ...(userComments[entry.feedKey] ?? [])];
            const likesCount = entry.initialLikes + (isLiked ? 1 : 0);
            const commentsOpen = openCommentKey === entry.instanceKey;

            const showCycleDivider =
              entry.cycle > 0 && idx % filteredBase.length === 0;

            return (
              <React.Fragment key={entry.instanceKey}>
                {showCycleDivider && (
                  <div className="flex items-center gap-3 py-1 text-center">
                    <div className="h-px flex-1 bg-interlink-border/60" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-interlink-muted">
                      Keep Exploring
                    </span>
                    <div className="h-px flex-1 bg-interlink-border/60" />
                  </div>
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

                  return (
                    <article
                      id={`post-${post.id}`}
                      className={`overflow-hidden rounded-3xl border bg-interlink-surface p-5 shadow-subtle transition-all hover:shadow-card ${
                        isHighlighted
                          ? "border-interlink-forest ring-2 ring-interlink-forest/40"
                          : "border-interlink-border/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            src={post.authorImage}
                            firstName={post.authorName.split(" ")[0] ?? "M"}
                            lastName={post.authorName.split(" ").slice(1).join(" ")}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-interlink-ink">
                              {post.authorName}
                            </p>
                            <p className="text-[11px] text-interlink-muted">
                              {formatDateTime(post.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          <Badge tone="forest" className="capitalize">
                            {post.postType}
                          </Badge>
                          <Badge tone="neutral">{post.topic}</Badge>
                        </div>
                      </div>

                      {post.title && (
                        <h3 className="mt-3.5 font-display text-base font-semibold leading-snug text-interlink-ink">
                          {post.title}
                        </h3>
                      )}

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-interlink-ink/90">
                        {post.body}
                      </p>

                      {post.mediaUrl && (
                        <div className="mt-3.5 overflow-hidden rounded-2xl border border-interlink-border bg-black/5 dark:bg-black/30">
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
                              className="relative bg-black"
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
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                              <div className="flex items-center gap-2.5 text-xs font-semibold text-interlink-ink">
                                <FileText className="h-4 w-4 text-interlink-forest" />
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
                                  className="inline-flex items-center gap-1 rounded-full bg-interlink-forest/12 px-3 py-1.5 text-xs font-semibold text-interlink-forest hover:bg-interlink-forest hover:text-white"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </button>
                                <a
                                  href={post.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Open document in new tab"
                                  className="inline-flex items-center gap-1 rounded-full border border-interlink-border px-2.5 py-1.5 text-xs text-interlink-muted hover:text-interlink-ink"
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
                          className="mt-3 flex items-center justify-between rounded-2xl border border-interlink-border bg-interlink-app-bg/50 px-3.5 py-2.5 text-xs font-semibold text-interlink-forest transition-colors hover:border-interlink-forest"
                        >
                          <span className="truncate">{post.externalLink}</span>
                          <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0" />
                        </a>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-interlink-border/60 pt-3">
                        <div className="flex items-center gap-4 text-interlink-muted">
                          <button
                            type="button"
                            onClick={() => void toggleCommunityPostLike(post.id)}
                            aria-label="Like post"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-rose-500"
                          >
                            <Heart
                              className={`h-4 w-4 ${post.viewerHasLiked ? "fill-rose-500 text-rose-500" : ""}`}
                            />
                            <span>{post.likesCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                            }
                            aria-label="Comment on post"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-interlink-ink"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>{post.commentsCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(entry.feedKey)}
                            aria-label="Bookmark post"
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:text-interlink-forest"
                          >
                            <Bookmark
                              className={`h-4 w-4 ${isBookmarked ? "fill-interlink-forest text-interlink-forest" : ""}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleShare(
                                post.title || `Post by ${post.authorName}`,
                                `/dashboard?post=${post.id}`,
                              )
                            }
                            aria-label="Share post"
                            className="inline-flex items-center gap-1 text-xs font-semibold hover:text-interlink-ink"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {commentsOpen && (
                        <div className="-mx-5 -mb-5 mt-3">
                          <CommentDrawer
                            comments={postComments}
                            draft={commentDrafts[entry.feedKey] ?? ""}
                            currentUserId={user.id}
                            postAuthorId={post.authorId}
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

                {/* 1. IMMERSIVE REEL CARD (TikTok / IG Reels Vertical Card) */}
                {entry.kind === "reel" && (
                  <article className="overflow-hidden rounded-3xl border border-interlink-border/80 bg-interlink-surface shadow-card">
                    <div
                      ref={(el) => registerContainer(entry.instanceKey, el)}
                      className="relative aspect-[4/5] max-h-[540px] w-full overflow-hidden bg-black"
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

                      {activeVideoKey !== entry.instanceKey && (
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/35" />
                      )}

                      {/* Top Badges + Sound Toggle */}
                      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          <Video className="h-3 w-3 text-emerald-400" />
                          {entry.reel.topicTag}
                        </span>
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

                      {/* Right Floating TikTok-style Social Rail */}
                      <div className="absolute bottom-24 right-3.5 z-10 flex flex-col items-center gap-3.5">
                        <button
                          type="button"
                          onClick={() => toggleLike(entry.feedKey)}
                          aria-label="Like reel"
                          className="flex flex-col items-center gap-1 text-white focus-ring"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition-transform active:scale-90">
                            <Heart
                              className={`h-5 w-5 ${isLiked ? "fill-rose-500 text-rose-500" : "text-white"}`}
                            />
                          </span>
                          <span className="text-[11px] font-semibold drop-shadow">{likesCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                          }
                          aria-label="Comment on reel"
                          className="flex flex-col items-center gap-1 text-white focus-ring"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition-transform active:scale-90">
                            <MessageCircle className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] font-semibold drop-shadow">{comments.length}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleBookmark(entry.feedKey)}
                          aria-label="Save reel"
                          className="flex flex-col items-center gap-1 text-white focus-ring"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition-transform active:scale-90">
                            <Bookmark
                              className={`h-5 w-5 ${isBookmarked ? "fill-amber-400 text-amber-400" : "text-white"}`}
                            />
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShare(entry.reel.title, "/learn")}
                          aria-label="Share reel"
                          className="flex flex-col items-center gap-1 text-white focus-ring"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-md transition-transform active:scale-90">
                            <Share2 className="h-5 w-5" />
                          </span>
                        </button>
                      </div>

                      {/* Bottom Creator Overlay */}
                      {activeVideoKey !== entry.instanceKey && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-14 p-4 text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{entry.reel.mentorName}</span>
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                              {entry.reel.profession}
                            </span>
                          </div>
                          <h3 className="mt-1 font-display text-base font-semibold leading-snug">
                            {entry.reel.title}
                          </h3>
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/80">
                            <Route className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            <span className="truncate">{entry.reel.careerPath}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Action Bar */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setVideoError(false);
                          setActiveReel(entry.reel);
                        }}
                        className="text-xs font-semibold text-interlink-forest hover:underline"
                      >
                        Full screen &amp; takeaway &rarr;
                      </button>
                      <Link
                        href={entry.reel.mentorId ? `/mentors/${entry.reel.mentorId}` : "/mentors"}
                        className="rounded-full bg-interlink-app-bg px-3.5 py-1.5 text-xs font-semibold text-interlink-ink transition-colors hover:bg-interlink-forest hover:text-white"
                      >
                        {entry.reel.mentorId ? "View Mentor" : "Browse Mentors"}
                      </Link>
                    </div>

                    {commentsOpen && (
                      <CommentDrawer
                        comments={comments}
                        draft={commentDrafts[entry.feedKey] ?? ""}
                        onDraftChange={(val) =>
                          setCommentDrafts((prev) => ({ ...prev, [entry.feedKey]: val }))
                        }
                        onSubmit={(e) => handleAddComment(entry.feedKey, e)}
                      />
                    )}
                  </article>
                )}

                {/* 2. CREATOR MENTOR SPOTLIGHT CARD (Instagram Creator Card) */}
                {entry.kind === "mentor" && (() => {
                  const isSavedMentor = Boolean(savedMentorIds[entry.mentor.userId]);
                  const isFull =
                    entry.mentor.availabilityStatus !== "accepting" ||
                    entry.mentor.activeMenteeCount >= entry.mentor.maximumMentees;

                  return (
                    <article className="overflow-hidden rounded-3xl border border-interlink-border/80 bg-interlink-surface shadow-subtle transition-shadow hover:shadow-card">
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
                              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-interlink-surface bg-emerald-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-interlink-ink">
                                {entry.mentor.firstName} {entry.mentor.lastName}
                              </span>
                              {entry.mentor.verificationStatus === "verified" && (
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-interlink-forest" />
                              )}
                            </div>
                            <p className="truncate text-xs text-interlink-muted">
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
                              ? "border border-interlink-border bg-interlink-app-bg text-interlink-ink"
                              : "bg-interlink-forest text-white hover:bg-interlink-forest-hover"
                          }`}
                        >
                          {isSavedMentor ? "Following" : "Follow"}
                        </button>
                      </div>

                      {/* Visual Creator Spotlight Body */}
                      <div className="mx-4 rounded-2xl bg-gradient-to-br from-interlink-forest/[0.08] via-interlink-app-bg to-interlink-gold/[0.08] p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          {typeof entry.mentor.matchScore === "number" && entry.mentor.matchScore > 0 && (
                            <Badge tone="forest">{entry.mentor.matchScore}% Match</Badge>
                          )}
                          {entry.mentor.industryName && (
                            <Badge tone="neutral">{entry.mentor.industryName}</Badge>
                          )}
                          <span className="text-[11px] font-medium text-interlink-muted">
                            {entry.mentor.yearsOfExperience}+ yrs exp
                          </span>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-interlink-ink/90">
                          {entry.mentor.biography}
                        </p>

                        {entry.mentor.expertiseTags.length > 0 && (
                          <div className="mt-3.5 flex flex-wrap gap-1.5">
                            {entry.mentor.expertiseTags.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-interlink-border/80 bg-interlink-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-interlink-ink"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Social Actions + Direct Connect */}
                      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                        <div className="flex items-center gap-4 text-interlink-muted">
                          <button
                            type="button"
                            onClick={() => toggleLike(entry.feedKey)}
                            aria-label="Like mentor card"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-rose-500"
                          >
                            <Heart
                              className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                            />
                            <span>{likesCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                            }
                            aria-label="Discuss mentor"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-interlink-ink"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>{comments.length}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleShare(
                                `${entry.mentor.firstName} ${entry.mentor.lastName} on Interlink`,
                                `/mentors/${entry.mentor.userId}`,
                              )
                            }
                            aria-label="Share mentor profile"
                            className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-interlink-ink"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/mentors/${entry.mentor.userId}`}
                            className="rounded-full border border-interlink-border px-3.5 py-1.5 text-xs font-semibold text-interlink-ink transition-colors hover:border-interlink-forest"
                          >
                            Profile
                          </Link>
                          <Link
                            href={`/mentors/${entry.mentor.userId}#request`}
                            className="rounded-full bg-interlink-forest px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                          >
                            Connect
                          </Link>
                        </div>
                      </div>

                      {commentsOpen && (
                        <CommentDrawer
                          comments={comments}
                          draft={commentDrafts[entry.feedKey] ?? ""}
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

                  return (
                    <article className="overflow-hidden rounded-3xl border border-interlink-border/80 bg-interlink-surface shadow-subtle transition-shadow hover:shadow-card">
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-interlink-app-bg">
                        <Image
                          src={entry.event.imageUrl || "/images/workshop-collaboration.jpg"}
                          alt={entry.event.title}
                          fill
                          sizes="(max-width: 680px) 100vw, 680px"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
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

                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-interlink-muted">
                          {entry.event.eventDate && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-interlink-forest" />
                              {new Date(entry.event.eventDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-interlink-forest" />
                            {entry.event.locationOrFormat}
                          </span>
                        </div>

                        <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-interlink-ink/85">
                          {entry.event.summary}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-interlink-border/60 pt-3">
                          <div className="flex items-center gap-4 text-interlink-muted">
                            <button
                              type="button"
                              onClick={() => toggleLike(entry.feedKey)}
                              aria-label="Like event"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-rose-500"
                            >
                              <Heart
                                className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                              />
                              <span>{likesCount}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                              }
                              aria-label="Comment on event"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-interlink-ink"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{comments.length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShare(entry.event.title, "/learn")}
                              aria-label="Share event"
                              className="inline-flex items-center gap-1 text-xs font-semibold hover:text-interlink-ink"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          </div>

                          {isRegistered ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-interlink-forest/10 px-3.5 py-1.5 text-xs font-semibold text-interlink-forest">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Reserved
                            </span>
                          ) : entry.event.ctaUrl ? (
                            <Link
                              href={entry.event.ctaUrl}
                              className="rounded-full bg-interlink-forest px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
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
                              className="rounded-full bg-interlink-forest px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
                            >
                              {entry.event.ctaLabel}
                            </button>
                          )}
                        </div>
                      </div>

                      {commentsOpen && (
                        <CommentDrawer
                          comments={comments}
                          draft={commentDrafts[entry.feedKey] ?? ""}
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
                  <article className="rounded-3xl border border-interlink-forest/30 bg-gradient-to-r from-interlink-forest/[0.08] via-interlink-surface to-interlink-surface p-5 shadow-subtle">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          src={entry.session.partnerImage}
                          firstName={entry.session.partnerName}
                          lastName=""
                          size="md"
                        />
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-interlink-forest">
                            <Calendar className="h-3 w-3" /> Upcoming Session
                          </span>
                          <h3 className="truncate font-display text-base font-semibold text-interlink-ink">
                            {entry.session.title}
                          </h3>
                          <p className="truncate text-xs text-interlink-muted">
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
                  <article className="rounded-3xl border border-interlink-gold/40 bg-gradient-to-r from-interlink-gold/10 via-interlink-surface to-interlink-surface p-5 shadow-subtle">
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
                          <h3 className="truncate text-sm font-semibold text-interlink-ink">
                            {entry.request.menteeName} wants to connect
                          </h3>
                          <p className="mt-0.5 line-clamp-2 text-xs text-interlink-muted">
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
                  <article className="rounded-3xl border border-interlink-border/80 bg-interlink-surface p-4.5 shadow-subtle">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-interlink-forest/10 text-interlink-forest">
                          <Target className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-interlink-forest">
                            Active Goal
                          </p>
                          <h3 className="truncate text-sm font-semibold text-interlink-ink">
                            {entry.goal.title}
                          </h3>
                        </div>
                      </div>
                      <Link
                        href={`/mentorships/${entry.goal.mentorshipId}`}
                        className="shrink-0 rounded-full border border-interlink-border px-3.5 py-1.5 text-xs font-semibold text-interlink-ink hover:border-interlink-forest"
                      >
                        Track
                      </Link>
                    </div>
                  </article>
                )}

                {/* 7. COMMUNITY POST / DISCUSSION CARD (X / Threads Style) */}
                {entry.kind === "post" && (
                  <article className="rounded-3xl border border-interlink-border/80 bg-interlink-surface p-5 shadow-subtle transition-shadow hover:shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-interlink-forest/12 text-interlink-forest">
                          <Compass className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-interlink-ink">
                            {entry.post.authorName}
                          </p>
                          <p className="text-[11px] text-interlink-muted">{entry.post.authorRole}</p>
                        </div>
                      </div>
                      <Badge tone="neutral">{entry.post.topic}</Badge>
                    </div>

                    <h3 className="mt-3.5 font-display text-base font-semibold leading-snug text-interlink-ink">
                      {entry.post.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-interlink-muted">
                      {entry.post.body}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-interlink-border/60 pt-3">
                      <div className="flex items-center gap-4 text-interlink-muted">
                        <button
                          type="button"
                          onClick={() => toggleLike(entry.feedKey)}
                          aria-label="Like post"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-rose-500"
                        >
                          <Heart
                            className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                          />
                          <span>{likesCount}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentKey(commentsOpen ? null : entry.instanceKey)
                          }
                          aria-label="Comment on post"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold hover:text-interlink-ink"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{comments.length}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(entry.feedKey)}
                          aria-label="Bookmark post"
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:text-interlink-forest"
                        >
                          <Bookmark
                            className={`h-4 w-4 ${isBookmarked ? "fill-interlink-forest text-interlink-forest" : ""}`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(entry.post.title, entry.post.href)}
                          aria-label="Share post"
                          className="inline-flex items-center gap-1 text-xs font-semibold hover:text-interlink-ink"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>

                      <Link
                        href={entry.post.href}
                        className="rounded-full bg-interlink-forest/10 px-3.5 py-1.5 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
                      >
                        {entry.post.ctaLabel} &rarr;
                      </Link>
                    </div>

                    {commentsOpen && (
                      <CommentDrawer
                        comments={comments}
                        draft={commentDrafts[entry.feedKey] ?? ""}
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
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-interlink-forest/30 border-t-interlink-forest" />
          <p className="mt-2 text-[11px] font-medium text-interlink-muted">
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
    </div>
  );
}

function CommentDrawer({
  comments,
  draft,
  currentUserId,
  postAuthorId,
  onDraftChange,
  onSubmit,
  onEditComment,
  onDeleteComment,
}: {
  comments: FeedComment[];
  draft: string;
  currentUserId?: string;
  postAuthorId?: string;
  onDraftChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onEditComment?: (commentId: string, newContent: string) => Promise<boolean>;
  onDeleteComment?: (commentId: string) => Promise<boolean>;
}) {
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
    <div className="border-t border-interlink-border/60 bg-interlink-app-bg/50 px-4 py-3.5">
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
                      className="min-w-0 flex-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1.5 text-xs text-interlink-ink focus:border-interlink-forest focus:outline-none"
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
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-interlink-border text-interlink-muted hover:text-interlink-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-interlink-ink">
                        {comment.author}
                      </span>{" "}
                      <span className="text-interlink-ink/85">{comment.text}</span>
                      <span className="ml-2 text-[10px] text-interlink-muted">
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
                            className="rounded p-1 text-interlink-muted hover:text-interlink-forest"
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
                            className="rounded p-1 text-interlink-muted hover:text-red-600"
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
        <p className="mb-3 text-xs text-interlink-muted">
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
          className="w-full min-w-0 rounded-full border border-interlink-border bg-interlink-surface px-3.5 py-2 text-base text-interlink-ink placeholder:text-interlink-muted focus:border-interlink-forest focus:outline-none sm:text-xs"
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
