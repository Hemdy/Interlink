"use client";

import React, { useState } from "react";
import type { CommunityPostType } from "@interlink/types";
import { BookOpen, Briefcase, HelpCircle, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { MediaDropzone, type UploadedMediaResult } from "@/components/ui/media/MediaDropzone";
import type { CommunityPostItem } from "@/features/content/infrastructure/postQueries";
import { postJson } from "@/lib/api/client";

const POST_TYPES: Array<{
  id: CommunityPostType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "post", label: "Post", icon: MessageSquarePlus },
  { id: "resource", label: "Resource", icon: BookOpen },
  { id: "opportunity", label: "Opportunity", icon: Briefcase },
  { id: "question", label: "Question", icon: HelpCircle },
];

const SUGGESTED_TOPICS = [
  "Career Growth",
  "Engineering",
  "Product & Design",
  "Mentorship Tips",
  "Opportunities",
  "Interview Prep",
];

export function CreatePostModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: CommunityPostItem) => void;
}) {
  const { pushToast } = useToast();
  const [postType, setPostType] = useState<CommunityPostType>("post");
  const [topic, setTopic] = useState("Career Growth");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [media, setMedia] = useState<UploadedMediaResult | null>(null);
  const [dropzoneKey, setDropzoneKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setPostType("post");
    setTopic("Career Growth");
    setTitle("");
    setBody("");
    setExternalLink("");
    setMedia(null);
    setDropzoneKey((k) => k + 1);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (body.trim().length < 3) {
      setError("Please write at least a few words before publishing.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await postJson<{ post: CommunityPostItem }>(
        "/api/v1/posts",
        {
          postType,
          topic: topic.trim() || "Community",
          title: title.trim() || null,
          body: body.trim(),
          mediaUrl: media?.url ?? null,
          mediaType: media?.category ?? null,
          externalLink: externalLink.trim() || null,
        },
        "Unable to publish your post right now.",
      );

      if (!res.ok || !res.data?.post) {
        setError(res.errorMessage ?? "Unable to publish post.");
        return;
      }

      onCreated(res.data.post);
      pushToast({
        kind: "success",
        title: "Published to public feed",
        description: "Community members can now view, like, and comment on your post.",
      });
      resetForm();
      onClose();
    } catch {
      setError("Network error while publishing post.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Community Post"
      maxWidthClass="max-w-xl"
      containerClassName="overflow-hidden rounded-3xl border border-interlink-border bg-interlink-surface shadow-modal"
      hideCloseButton
    >
      <div className="flex items-center justify-between border-b border-interlink-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-interlink-ink">
            Create Post
          </h2>
          <p className="text-xs text-interlink-muted">
            Publish updates, career resources, or opportunities to the public feed.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close create post modal"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-interlink-border text-interlink-muted hover:text-interlink-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
        {error && <ErrorAlert message={error} />}

        {/* Content Type Selector */}
        <div>
          <p className="mb-2 text-xs font-semibold text-interlink-ink">Content Type</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POST_TYPES.map((item) => {
              const Icon = item.icon;
              const active = postType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPostType(item.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "border-interlink-forest bg-interlink-forest text-white shadow-subtle"
                      : "border-interlink-border bg-interlink-app-bg/40 text-interlink-muted hover:border-interlink-forest/50 hover:text-interlink-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Chips + Input */}
        <div>
          <Input
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Career Growth"
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_TOPICS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  topic === item
                    ? "bg-interlink-forest/15 text-interlink-forest"
                    : "border border-interlink-border bg-interlink-app-bg/50 text-interlink-muted hover:text-interlink-ink"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Headline (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your post or resource a crisp title..."
        />

        <div>
          <label
            htmlFor="create-post-body"
            className="mb-1.5 block text-xs font-semibold text-interlink-ink"
          >
            What would you like to share?
          </label>
          <textarea
            id="create-post-body"
            rows={4}
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a career insight, study resource, internship lead, or ask mentors for advice..."
            className="w-full rounded-2xl border border-interlink-border bg-interlink-app-bg/40 px-3.5 py-2.5 text-base text-interlink-ink placeholder:text-interlink-muted focus:border-interlink-forest focus:outline-none sm:text-sm"
          />
        </div>

        <Input
          label="Reference / Resource URL (optional)"
          type="url"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          placeholder="https://..."
        />

        <MediaDropzone
          key={dropzoneKey}
          label="Attach Image, Video, or Document (optional)"
          acceptKind="all"
          purpose="post"
          cropAspect="free"
          compact
          onUploaded={(res) => setMedia(res)}
          onRemoved={() => setMedia(null)}
        />

        <div className="flex items-center justify-end gap-2 border-t border-interlink-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Publish to Feed
          </Button>
        </div>
      </form>
    </Modal>
  );
}
