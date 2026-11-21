"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@interlink/utils";
import type {
  CommunityPostType,
  MembershipTier,
  MentorshipPricingMode,
  SessionUser,
} from "@interlink/types";
import {
  Bookmark,
  ExternalLink,
  FileText,
  Film,
  Heart,
  LayoutGrid,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type {
  CommunityPostItem,
  UserPublishedArticleItem,
  UserPublishedReelItem,
} from "@/features/content/infrastructure/postQueries";
import { CreatePostModal } from "@/features/dashboard/ui/CreatePostModal";
import { ProfileEditorClient } from "@/features/profiles/ui/ProfileEditorClient";
import { ProfileSettingsPanel } from "@/features/profiles/ui/ProfileSettingsPanel";

type ContentTab = "posts" | "videos" | "articles";
type ProfilePanel = "content" | "edit" | "settings";

interface ProfileHubClientProps {
  user: SessionUser;
  role: "mentor" | "mentee";
  industries: Array<{ id: string; name: string }>;
  initialMentor: {
    biography: string;
    currentPosition: string;
    organisation: string | null;
    industryId: string | null;
    yearsOfExperience: number;
    qualifications: string | null;
    expertiseAreas: string[];
    skills: string[];
    languages: string[];
    location: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    mentorshipApproach: string | null;
    sessionPreference: "online" | "in_person" | "hybrid";
    availabilityStatus: "accepting" | "paused" | "full";
    maximumMentees: number;
    pricingMode?: MentorshipPricingMode;
    offersFreeMentorship?: boolean;
    hourlyRateNgn?: number | null;
    sessionRateNgn?: number | null;
    monthlyRateNgn?: number | null;
    visibility: "public" | "members_only" | "private";
    verificationStatus: string;
    profileCompletion: number;
  } | null;
  initialMentee: {
    education: string | null;
    currentOccupation: string;
    industryInterestId: string | null;
    careerInterests: string[];
    careerAspirations: string;
    existingSkills: string[];
    skillsToDevelop: string[];
    currentChallenges: string | null;
    mentorshipExpectations: string | null;
    learningObjectives: string | null;
    preferredLanguage: string;
    sessionPreference: "online" | "in_person" | "hybrid";
    location: string | null;
    visibility: "public" | "members_only" | "private";
    profileCompletion: number;
  } | null;
  initialSlots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone: string;
    isActive: boolean;
  }>;
  initialPosts: CommunityPostItem[];
  initialVideos: UserPublishedReelItem[];
  initialArticles: UserPublishedArticleItem[];
  blockedUsers?: Array<{ blockedUserId: string; firstName: string; lastName: string }>;
  unreadNotifications?: number;
  membershipTier?: MembershipTier;
}

export function ProfileHubClient({
  user,
  role,
  industries,
  initialMentor,
  initialMentee,
  initialSlots,
  initialPosts,
  initialVideos,
  initialArticles,
  blockedUsers = [],
  unreadNotifications = 0,
  membershipTier = "free",
}: ProfileHubClientProps) {
  const { pushToast } = useToast();
  const [activePanel, setActivePanel] = useState<ProfilePanel>("content");
  const [contentTab, setContentTab] = useState<ContentTab>("posts");
  const [profileImage, setProfileImage] = useState<string | null>(user.profileImage ?? null);
  const [posts, setPosts] = useState<CommunityPostItem[]>(initialPosts);
  const [videos, setVideos] = useState<UserPublishedReelItem[]>(initialVideos);
  const [articles, setArticles] = useState<UserPublishedArticleItem[]>(initialArticles);

  const [createOpen, setCreateOpen] = useState(false);
  const [inspectedPost, setInspectedPost] = useState<CommunityPostItem | null>(null);
  const [inspectedVideo, setInspectedVideo] = useState<{
    title: string;
    videoUrl: string;
    subtitle: string;
  } | null>(null);

  // Edit Post modal state
  const [editingPost, setEditingPost] = useState<CommunityPostItem | null>(null);
  const [editPostType, setEditPostType] = useState<CommunityPostType>("post");
  const [editPostTopic, setEditPostTopic] = useState("");
  const [editPostTitle, setEditPostTitle] = useState("");
  const [editPostBody, setEditPostBody] = useState("");
  const [editPostLink, setEditPostLink] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [editPostError, setEditPostError] = useState<string | null>(null);

  // Edit Article (resource) modal state
  const [editingArticle, setEditingArticle] = useState<UserPublishedArticleItem | null>(null);
  const [editArticleTitle, setEditArticleTitle] = useState("");
  const [editArticleCategory, setEditArticleCategory] = useState("");
  const [editArticleDesc, setEditArticleDesc] = useState("");
  const [editArticleUrl, setEditArticleUrl] = useState("");
  const [savingArticle, setSavingArticle] = useState(false);
  const [editArticleError, setEditArticleError] = useState<string | null>(null);

  // Delete confirmation target
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "post" | "article" | "reel";
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Respect ?tab=settings, ?tab=edit, #availability, or #cat-notifications anchors
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "settings" || window.location.hash === "#cat-notifications") {
      setActivePanel("settings");
      if (window.location.hash) {
        const targetId = window.location.hash.slice(1);
        window.setTimeout(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
        }, 160);
      }
      return;
    }

    if (window.location.hash === "#availability" || tabParam === "edit") {
      setActivePanel("edit");
      if (window.location.hash === "#availability") {
        window.setTimeout(() => {
          document.getElementById("availability")?.scrollIntoView({ behavior: "smooth" });
        }, 160);
      }
    }
  }, []);

  const videoPosts = useMemo(
    () => posts.filter((p) => p.mediaType === "video" && p.mediaUrl),
    [posts],
  );
  const articlePosts = useMemo(
    () => posts.filter((p) => p.postType === "resource" || p.mediaType === "document"),
    [posts],
  );
  const totalLikes = useMemo(
    () => posts.reduce((acc, p) => acc + p.likesCount, 0),
    [posts],
  );
  const handleText = user.username
    ? `@${user.username}`
    : `@${(user.email.split("@")[0] ?? user.firstName).toLowerCase()}`;

  const headline =
    role === "mentor"
      ? [initialMentor?.currentPosition, initialMentor?.organisation]
          .filter(Boolean)
          .join(" · ") || "Interlink Mentor"
      : initialMentee?.currentOccupation || "Interlink Member";

  const bioText =
    role === "mentor"
      ? initialMentor?.biography || ""
      : initialMentee?.careerAspirations || "";

  function openPostEditor(post: CommunityPostItem) {
    setEditingPost(post);
    setEditPostType(post.postType);
    setEditPostTopic(post.topic);
    setEditPostTitle(post.title ?? "");
    setEditPostBody(post.body);
    setEditPostLink(post.externalLink ?? "");
    setEditPostError(null);
  }

  async function saveEditedPost(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPost) return;
    setEditPostError(null);
    setSavingPost(true);
    try {
      const res = await fetch(`/api/v1/posts/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: editPostType,
          topic: editPostTopic.trim() || "Community",
          title: editPostTitle.trim() || null,
          body: editPostBody.trim(),
          externalLink: editPostLink.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setEditPostError(json.error?.message || "Could not update post.");
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                postType: editPostType,
                topic: editPostTopic.trim() || "Community",
                title: editPostTitle.trim() || null,
                body: editPostBody.trim(),
                externalLink: editPostLink.trim() || null,
              }
            : p,
        ),
      );
      setInspectedPost((prev) =>
        prev && prev.id === editingPost.id
          ? {
              ...prev,
              postType: editPostType,
              topic: editPostTopic.trim() || "Community",
              title: editPostTitle.trim() || null,
              body: editPostBody.trim(),
              externalLink: editPostLink.trim() || null,
            }
          : prev,
      );
      pushToast({ kind: "success", title: "Post updated" });
      setEditingPost(null);
    } catch {
      setEditPostError("Network error while saving post.");
    } finally {
      setSavingPost(false);
    }
  }

  function openArticleEditor(article: UserPublishedArticleItem) {
    setEditingArticle(article);
    setEditArticleTitle(article.title);
    setEditArticleCategory(article.category ?? "");
    setEditArticleDesc(article.description);
    setEditArticleUrl(article.externalUrl);
    setEditArticleError(null);
  }

  async function saveEditedArticle(e: React.FormEvent) {
    e.preventDefault();
    if (!editingArticle) return;
    setEditArticleError(null);
    setSavingArticle(true);
    try {
      const res = await fetch(`/api/v1/resources/${editingArticle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editArticleTitle.trim(),
          category: editArticleCategory.trim() || null,
          description: editArticleDesc.trim(),
          externalUrl: editArticleUrl.trim(),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setEditArticleError(json.error?.message || "Could not update article.");
        return;
      }

      setArticles((prev) =>
        prev.map((a) =>
          a.id === editingArticle.id
            ? {
                ...a,
                title: editArticleTitle.trim(),
                category: editArticleCategory.trim() || null,
                description: editArticleDesc.trim(),
                externalUrl: editArticleUrl.trim(),
              }
            : a,
        ),
      );
      pushToast({ kind: "success", title: "Article updated" });
      setEditingArticle(null);
    } catch {
      setEditArticleError("Network error while saving article.");
    } finally {
      setSavingArticle(false);
    }
  }

  async function confirmDeleteTarget() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deleteTarget.kind === "post"
          ? `/api/v1/posts/${deleteTarget.id}`
          : deleteTarget.kind === "article"
            ? `/api/v1/resources/${deleteTarget.id}`
            : `/api/v1/reels/${deleteTarget.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        pushToast({ kind: "error", title: "Unable to delete item" });
        return;
      }

      if (deleteTarget.kind === "post") {
        setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        if (inspectedPost?.id === deleteTarget.id) setInspectedPost(null);
      } else if (deleteTarget.kind === "article") {
        setArticles((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      } else {
        setVideos((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      }

      pushToast({ kind: "info", title: `${deleteTarget.label} deleted` });
      setDeleteTarget(null);
    } catch {
      pushToast({ kind: "error", title: "Network error deleting item" });
    } finally {
      setDeleting(false);
    }
  }

  const tabs: Array<{
    id: ContentTab;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "posts", label: "Posts", count: posts.length, icon: LayoutGrid },
    {
      id: "videos",
      label: "Videos",
      count: videoPosts.length + videos.length,
      icon: Film,
    },
    {
      id: "articles",
      label: "Articles",
      count: articlePosts.length + articles.length,
      icon: FileText,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* TikTok + Instagram Inspired Profile Header Card */}
      <Card elevated className="overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col items-center text-center">
          {/* 1. Profile / Display Picture */}
          <div className="relative shrink-0" data-profile-card-avatar="true">
            <div className="rounded-full bg-gradient-to-tr from-interlink-gold via-interlink-forest to-emerald-400 p-[3px] shadow-card">
              <div className="rounded-full border-[3px] border-interlink-surface bg-interlink-surface">
                <UserAvatar
                  src={profileImage}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="lg"
                  className="h-20 w-20 border-0 sm:h-24 sm:w-24"
                />
              </div>
            </div>
            {initialMentor?.verificationStatus === "verified" && (
              <span
                title="Verified Mentor"
                className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-interlink-surface bg-interlink-forest text-white shadow-sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            )}
          </div>

          {/* 2. Role (Mentor) & Subscription Badges directly below profile picture */}
          <div
            data-profile-card-badges="true"
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
          >
            <Badge tone="forest" className="capitalize">
              {role}
            </Badge>
            <Badge tone={membershipTier === "free" ? "neutral" : "gold"} className="capitalize">
              {membershipTier === "free" ? "Free" : `Interlink ${membershipTier}`}
            </Badge>
          </div>

          {/* 3. User's Name directly below the badges */}
          <h1
            data-profile-card-name="true"
            className="mt-2 font-display text-xl font-bold tracking-tight text-interlink-ink sm:text-2xl"
          >
            {user.firstName} {user.lastName}
          </h1>

          <div className="mt-0.5 w-full max-w-xl min-w-0">
            <p className="text-xs font-medium text-interlink-muted">{handleText}</p>
            <p className="mt-1.5 text-sm font-medium text-interlink-ink/90">{headline}</p>

            {bioText && (
              <p className="mx-auto mt-1.5 line-clamp-2 max-w-xl text-xs leading-relaxed text-interlink-muted">
                {bioText}
              </p>
            )}

            {/* IG / TikTok 4-Metric Row */}
            <div className="mx-auto mt-4 grid max-w-md grid-cols-4 rounded-2xl bg-interlink-app-bg/70 py-2.5 text-center shadow-subtle">
              <div className="px-2">
                <p className="font-display text-base font-bold text-interlink-ink">
                  {posts.length}
                </p>
                <p className="text-[11px] text-interlink-muted">Posts</p>
              </div>
              <div className="px-2">
                <p className="font-display text-base font-bold text-interlink-ink">
                  {videoPosts.length + videos.length}
                </p>
                <p className="text-[11px] text-interlink-muted">Videos</p>
              </div>
              <div className="px-2">
                <p className="font-display text-base font-bold text-interlink-ink">
                  {articlePosts.length + articles.length}
                </p>
                <p className="text-[11px] text-interlink-muted">Articles</p>
              </div>
              <div className="px-2">
                <p className="font-display text-base font-bold text-interlink-ink">
                  {totalLikes}
                </p>
                <p className="text-[11px] text-interlink-muted">Likes</p>
              </div>
            </div>

            {/* Action Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" /> Create Post
              </Button>
              {activePanel !== "content" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setActivePanel("content")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  View Content
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant={activePanel === "edit" ? "primary" : "outline"}
                aria-expanded={activePanel === "edit"}
                onClick={() =>
                  setActivePanel((prev) => (prev === "edit" ? "content" : "edit"))
                }
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Edit Profile
              </Button>
              {role === "mentor" && (
                <Link
                  href={`/mentors/${user.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-interlink-app-bg px-3.5 text-xs font-semibold text-interlink-ink transition-colors hover:bg-interlink-forest/10 hover:text-interlink-forest"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Public View
                </Link>
              )}
              <button
                type="button"
                onClick={() =>
                  setActivePanel((prev) => (prev === "settings" ? "content" : "settings"))
                }
                aria-label="Account Settings"
                aria-expanded={activePanel === "settings"}
                aria-pressed={activePanel === "settings"}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors ${
                  activePanel === "settings"
                    ? "bg-interlink-forest text-white shadow-subtle"
                    : "bg-interlink-app-bg text-interlink-ink hover:bg-interlink-forest/10 hover:text-interlink-forest"
                }`}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content Tabs Bar (Shown when viewing profile content) */}
      {activePanel === "content" && (
        <div className="grid grid-cols-3 rounded-2xl bg-interlink-surface p-1 shadow-subtle">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = contentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setContentTab(tab.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-interlink-forest text-white shadow-subtle"
                    : "text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tab.label}</span>
                <span
                  className={`hidden rounded-full px-1.5 py-0.5 text-[10px] sm:inline ${
                    active ? "bg-white/20 text-white" : "bg-interlink-app-bg text-interlink-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 1: ALL POSTS (IG/TikTok Visual Grid) */}
      {activePanel === "content" && contentTab === "posts" && (
        posts.length === 0 ? (
          <Card className="p-8 text-center">
            <LayoutGrid className="mx-auto h-7 w-7 text-interlink-muted" />
            <h2 className="mt-3 font-display text-base font-semibold text-interlink-ink">
              No published posts yet
            </h2>
            <p className="mt-1 text-xs text-interlink-muted">
              Share insights, videos, or career resources with the Interlink community.
            </p>
            <Button type="button" size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Your First Post
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-interlink-surface shadow-subtle transition-shadow hover:shadow-card"
              >
                <button
                  type="button"
                  onClick={() => setInspectedPost(post)}
                  className="relative aspect-[4/5] w-full overflow-hidden bg-interlink-app-bg text-left focus:outline-none"
                >
                  {post.mediaUrl && post.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.mediaUrl}
                      alt={post.title || "Post thumbnail"}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : post.mediaUrl && post.mediaType === "video" ? (
                    <div className="relative h-full w-full bg-black">
                      <video
                        src={post.mediaUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover opacity-90"
                      />
                      <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                      </span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-interlink-forest/10 via-interlink-surface to-interlink-gold/10 p-3.5">
                      <Badge tone="forest" className="w-fit capitalize">
                        {post.postType}
                      </Badge>
                      <div>
                        {post.title && (
                          <p className="line-clamp-2 font-display text-sm font-semibold text-interlink-ink">
                            {post.title}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-interlink-muted">
                          {post.body}
                        </p>
                      </div>
                      <span className="text-[10px] font-medium text-interlink-forest">
                        {post.topic}
                      </span>
                    </div>
                  )}

                  {/* Bottom Metrics Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 py-2 text-[11px] font-semibold text-white">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" /> {post.likesCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount}
                    </span>
                  </div>
                </button>

                {/* Quick Edit / Delete Strip */}
                <div className="flex items-center justify-between border-t border-interlink-border/60 px-2.5 py-2">
                  <span className="truncate text-[11px] font-medium text-interlink-muted">
                    {post.title || post.topic}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openPostEditor(post)}
                      aria-label="Edit post"
                      className="rounded-lg p-1.5 text-interlink-muted hover:bg-interlink-app-bg hover:text-interlink-forest"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "post",
                          id: post.id,
                          label: post.title || "Post",
                        })
                      }
                      aria-label="Delete post"
                      className="rounded-lg p-1.5 text-interlink-muted hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 2: VIDEOS */}
      {activePanel === "content" && contentTab === "videos" && (
        videoPosts.length === 0 && videos.length === 0 ? (
          <Card className="p-8 text-center">
            <Film className="mx-auto h-7 w-7 text-interlink-muted" />
            <h2 className="mt-3 font-display text-base font-semibold text-interlink-ink">
              No videos published yet
            </h2>
            <p className="mt-1 text-xs text-interlink-muted">
              Publish a video post from Create Post or share a spotlight reel.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {videoPosts.map((post) => (
              <div
                key={`vp-${post.id}`}
                className="overflow-hidden rounded-2xl bg-interlink-surface shadow-subtle"
              >
                <button
                  type="button"
                  onClick={() =>
                    setInspectedVideo({
                      title: post.title || post.topic,
                      videoUrl: post.mediaUrl!,
                      subtitle: post.body,
                    })
                  }
                  className="relative aspect-[4/5] w-full bg-black text-left"
                >
                  <video
                    src={post.mediaUrl!}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-interlink-forest">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                  </span>
                </button>
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="truncate text-xs font-semibold text-interlink-ink">
                    {post.title || post.topic}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openPostEditor(post)}
                      aria-label="Edit video post"
                      className="rounded-lg p-1 text-interlink-muted hover:text-interlink-forest"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "post",
                          id: post.id,
                          label: post.title || "Video post",
                        })
                      }
                      aria-label="Delete video post"
                      className="rounded-lg p-1 text-interlink-muted hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {videos.map((reel) => (
              <div
                key={`reel-${reel.id}`}
                className="overflow-hidden rounded-2xl bg-interlink-surface shadow-subtle"
              >
                <button
                  type="button"
                  onClick={() =>
                    setInspectedVideo({
                      title: reel.title,
                      videoUrl: reel.videoUrl,
                      subtitle: reel.summary,
                    })
                  }
                  className="relative aspect-[4/5] w-full bg-black text-left"
                >
                  <video
                    src={reel.videoUrl}
                    poster={reel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {reel.durationLabel}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-interlink-forest">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                  </span>
                </button>
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="truncate text-xs font-semibold text-interlink-ink">
                    {reel.title}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "reel",
                        id: reel.id,
                        label: reel.title,
                      })
                    }
                    aria-label="Delete video reel"
                    className="rounded-lg p-1 text-interlink-muted hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* TAB 3: ARTICLES & RESOURCES */}
      {activePanel === "content" && contentTab === "articles" && (
        articlePosts.length === 0 && articles.length === 0 ? (
          <Card className="p-8 text-center">
            <Bookmark className="mx-auto h-7 w-7 text-interlink-muted" />
            <h2 className="mt-3 font-display text-base font-semibold text-interlink-ink">
              No articles or guides published yet
            </h2>
            <p className="mt-1 text-xs text-interlink-muted">
              Create a Resource post or publish a learning guide to showcase it here.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {articlePosts.map((post) => (
              <Card key={`art-post-${post.id}`} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="forest">{post.topic}</Badge>
                      <span className="text-[11px] text-interlink-muted">
                        {formatDateTime(post.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold text-interlink-ink">
                      {post.title || "Community Resource"}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-interlink-muted">
                      {post.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openPostEditor(post)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "post",
                          id: post.id,
                          label: post.title || "Article post",
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {articles.map((article) => (
              <Card key={`art-${article.id}`} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral" className="capitalize">
                        {article.resourceType}
                      </Badge>
                      {article.category && <Badge tone="forest">{article.category}</Badge>}
                      <span className="text-[11px] text-interlink-muted">
                        {formatDateTime(article.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-base font-semibold text-interlink-ink">
                      {article.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-interlink-muted">
                      {article.description}
                    </p>
                    <a
                      href={article.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-interlink-forest hover:underline"
                    >
                      Open Article <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openArticleEditor(article)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "article",
                          id: article.id,
                          label: article.title,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* EXPANDABLE SECTION: FULL PROFILE DETAILS EDITOR */}
      {activePanel === "edit" && (
        <div className="animate-hero-up">
          <ProfileEditorClient
            role={role}
            industries={industries}
            initialMentor={initialMentor}
            initialMentee={initialMentee}
            initialSlots={initialSlots}
            userFirstName={user.firstName}
            userLastName={user.lastName}
            initialProfileImage={profileImage}
            onProfileImageChange={(nextUrl) => setProfileImage(nextUrl)}
          />
        </div>
      )}

      {/* EXPANDABLE SECTION: CONSOLIDATED ACCOUNT SETTINGS, MEMBERSHIP & UPDATES */}
      {activePanel === "settings" && (
        <div className="animate-hero-up">
          <ProfileSettingsPanel
            user={user}
            blockedUsers={blockedUsers}
            unreadNotifications={unreadNotifications}
            membershipTier={membershipTier}
            onOpenAvailability={() => {
              setActivePanel("edit");
              window.setTimeout(() => {
                document.getElementById("availability")?.scrollIntoView({ behavior: "smooth" });
              }, 120);
            }}
          />
        </div>
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(createdPost) => {
          setPosts((prev) => [createdPost, ...prev]);
          setActivePanel("content");
          setContentTab("posts");
        }}
      />

      {/* Inspect Post Detail Modal */}
      <Modal
        open={Boolean(inspectedPost)}
        onClose={() => setInspectedPost(null)}
        title={inspectedPost?.title || "Post Details"}
        maxWidthClass="max-w-xl"
        hideCloseButton
      >
        {inspectedPost && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-interlink-border pb-3">
              <div className="flex items-center gap-2">
                <Badge tone="forest" className="capitalize">
                  {inspectedPost.postType}
                </Badge>
                <Badge tone="neutral">{inspectedPost.topic}</Badge>
              </div>
              <button
                type="button"
                onClick={() => setInspectedPost(null)}
                aria-label="Close post details"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-interlink-border text-interlink-muted hover:text-interlink-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {inspectedPost.title && (
              <h3 className="font-display text-lg font-semibold text-interlink-ink">
                {inspectedPost.title}
              </h3>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-interlink-ink/90">
              {inspectedPost.body}
            </p>

            {inspectedPost.mediaUrl && inspectedPost.mediaType === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inspectedPost.mediaUrl}
                alt={inspectedPost.title || "Post attachment"}
                className="max-h-96 w-full rounded-2xl object-cover"
              />
            )}
            {inspectedPost.mediaUrl && inspectedPost.mediaType === "video" && (
              <video
                src={inspectedPost.mediaUrl}
                controls
                playsInline
                className="max-h-96 w-full rounded-2xl bg-black"
              />
            )}

            <div className="flex items-center justify-between border-t border-interlink-border pt-3 text-xs text-interlink-muted">
              <span>
                {inspectedPost.likesCount} likes · {inspectedPost.commentsCount} comments
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const target = inspectedPost;
                    setInspectedPost(null);
                    openPostEditor(target);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setDeleteTarget({
                      kind: "post",
                      id: inspectedPost.id,
                      label: inspectedPost.title || "Post",
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" /> Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Video Player Modal */}
      <Modal
        open={Boolean(inspectedVideo)}
        onClose={() => setInspectedVideo(null)}
        title={inspectedVideo?.title || "Video"}
        maxWidthClass="max-w-2xl"
      >
        {inspectedVideo && (
          <div className="space-y-3">
            <video
              src={inspectedVideo.videoUrl}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-2xl bg-black"
            />
            <p className="text-xs leading-relaxed text-interlink-muted">
              {inspectedVideo.subtitle}
            </p>
          </div>
        )}
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        open={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        title="Edit Post"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={saveEditedPost} className="space-y-4">
          {editPostError && <ErrorAlert message={editPostError} />}
          <Input
            label="Topic"
            value={editPostTopic}
            onChange={(e) => setEditPostTopic(e.target.value)}
            required
          />
          <Input
            label="Headline (optional)"
            value={editPostTitle}
            onChange={(e) => setEditPostTitle(e.target.value)}
          />
          <div>
            <label
              htmlFor="edit-post-body"
              className="mb-1.5 block text-xs font-semibold text-interlink-ink"
            >
              Content
            </label>
            <textarea
              id="edit-post-body"
              rows={4}
              required
              value={editPostBody}
              onChange={(e) => setEditPostBody(e.target.value)}
              className="w-full rounded-2xl border border-interlink-border bg-interlink-app-bg/40 px-3.5 py-2.5 text-sm text-interlink-ink focus:border-interlink-forest focus:outline-none"
            />
          </div>
          <Input
            label="Reference URL (optional)"
            type="url"
            value={editPostLink}
            onChange={(e) => setEditPostLink(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingPost(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingPost}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Article Modal */}
      <Modal
        open={Boolean(editingArticle)}
        onClose={() => setEditingArticle(null)}
        title="Edit Article"
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={saveEditedArticle} className="space-y-4">
          {editArticleError && <ErrorAlert message={editArticleError} />}
          <Input
            label="Title"
            value={editArticleTitle}
            onChange={(e) => setEditArticleTitle(e.target.value)}
            required
          />
          <Input
            label="Category"
            value={editArticleCategory}
            onChange={(e) => setEditArticleCategory(e.target.value)}
          />
          <div>
            <label
              htmlFor="edit-article-desc"
              className="mb-1.5 block text-xs font-semibold text-interlink-ink"
            >
              Description
            </label>
            <textarea
              id="edit-article-desc"
              rows={4}
              required
              value={editArticleDesc}
              onChange={(e) => setEditArticleDesc(e.target.value)}
              className="w-full rounded-2xl border border-interlink-border bg-interlink-app-bg/40 px-3.5 py-2.5 text-sm text-interlink-ink focus:border-interlink-forest focus:outline-none"
            />
          </div>
          <Input
            label="External or File URL"
            value={editArticleUrl}
            onChange={(e) => setEditArticleUrl(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingArticle(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingArticle}>
              Save Article
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.label ?? "item"}?`}
        description="This action permanently deletes this item from Interlink and cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDeleteTarget()}
      />
    </div>
  );
}
