"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Route, Sparkles, Video } from "lucide-react";
import type { MentorReelItem, SessionUser } from "@interlink/types";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Reveal } from "@/components/ui/Reveal";
import { useToast } from "@/components/ui/ToastProvider";
import { postJson } from "@/lib/api/client";

export function MentorSpotlightSection({
  initialReels,
  user,
}: {
  initialReels: MentorReelItem[];
  user: SessionUser | null;
}) {
  const { pushToast } = useToast();
  const [reels, setReels] = useState<MentorReelItem[]>(initialReels);
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [activeReel, setActiveReel] = useState<MentorReelItem | null>(null);
  const [videoError, setVideoError] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [mentorName, setMentorName] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : "",
  );
  const [profession, setProfession] = useState("");
  const [careerPath, setCareerPath] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationLabel, setDurationLabel] = useState("0:45");
  const [topicTag, setTopicTag] = useState("Career Growth");

  const canPublish = Boolean(
    user &&
      (user.roles.includes("mentor") ||
        user.roles.some((r) =>
          ["admin", "super_admin", "community_manager", "programme_coordinator"].includes(r),
        )),
  );

  const topics = useMemo(() => {
    const unique = Array.from(new Set(reels.map((r) => r.topicTag)));
    return ["All", ...unique];
  }, [reels]);

  const visibleReels = useMemo(
    () =>
      selectedTopic === "All"
        ? reels
        : reels.filter((reel) => reel.topicTag === selectedTopic),
    [reels, selectedTopic],
  );

  async function handlePublishReel(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const result = await postJson<{ reel: MentorReelItem }>(
        "/api/v1/reels",
        {
          mentorName,
          profession,
          careerPath,
          title,
          summary,
          videoUrl,
          durationLabel,
          topicTag,
        },
        "Unable to publish motivational reel.",
      );
      if (!result.ok || !result.data?.reel) {
        setFormError(result.errorMessage ?? "Unable to publish motivational reel.");
        return;
      }
      setReels((prev) => [result.data!.reel, ...prev]);
      setCreateOpen(false);
      setTitle("");
      setSummary("");
      setVideoUrl("");
      pushToast({ kind: "success", title: "Mentor spotlight reel published" });
    } catch {
      setFormError("Network error while publishing your reel.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-t border-interlink-border bg-interlink-app-bg py-16 sm:py-20">
      <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
        <Reveal>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-interlink-forest">
                Mentor Spotlight
              </p>
              <h2 className="mt-2 font-display text-2xl font-light text-interlink-ink sm:text-3xl">
                Short motivational reels from mentors who walked the path.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-interlink-muted">
                Hear practical insights on career pivots, leadership lessons, and real progression
                journeys directly from Interlink mentors.
              </p>
            </div>
            {canPublish && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Share a Mentor Reel
              </Button>
            )}
          </div>
        </Reveal>

        <div className="mt-6 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`rounded-[2px] border px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTopic === topic
                  ? "border-interlink-forest bg-interlink-forest text-white"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleReels.map((reel, idx) => (
            <Reveal key={reel.id} delayMs={idx * 80} className="h-full">
              <Card
                elevated
                className="flex h-full flex-col justify-between overflow-hidden p-0 hover:-translate-y-0.5 hover:border-interlink-forest/50"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(false);
                      setActiveReel(reel);
                    }}
                    className="group relative block aspect-[16/10] w-full overflow-hidden bg-interlink-ink/10 text-left focus-ring"
                    aria-label={`Play motivational reel: ${reel.title}`}
                  >
                    <Image
                      src={reel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                      alt={`${reel.mentorName} — ${reel.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-[2px] bg-interlink-forest/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                      {reel.topicTag}
                    </span>
                    <span className="absolute right-3 top-3 rounded-[2px] bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                      {reel.durationLabel}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-interlink-forest shadow-elevated transition-transform duration-200 group-hover:scale-110">
                        <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-sm font-semibold leading-snug">{reel.mentorName}</p>
                      <p className="text-xs text-white/85">{reel.profession}</p>
                    </div>
                  </button>

                  <div className="p-5">
                    <h3 className="font-display text-base font-semibold leading-snug text-interlink-ink">
                      {reel.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-interlink-muted">
                      {reel.summary}
                    </p>
                    <div className="mt-3 flex items-start gap-2 rounded-[2px] border border-interlink-border bg-interlink-app-bg px-3 py-2 text-[11px] text-interlink-ink">
                      <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interlink-forest" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-interlink-forest">Career path:</span>{" "}
                        {reel.careerPath}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-interlink-border/70 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(false);
                      setActiveReel(reel);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-interlink-forest hover:underline"
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    Watch Reel
                  </button>
                  {reel.mentorId ? (
                    <Link
                      href={`/mentors/${reel.mentorId}`}
                      className="text-xs font-medium text-interlink-muted hover:text-interlink-forest"
                    >
                      View Mentor &rarr;
                    </Link>
                  ) : (
                    <Link
                      href="/mentors"
                      className="text-xs font-medium text-interlink-muted hover:text-interlink-forest"
                    >
                      Explore Mentors &rarr;
                    </Link>
                  )}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      <Modal
        open={Boolean(activeReel)}
        onClose={() => setActiveReel(null)}
        title={activeReel?.title ?? "Mentor Spotlight"}
        maxWidthClass="max-w-[720px]"
      >
        {activeReel && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[2px] border border-interlink-border bg-black">
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
                <div className="relative aspect-video w-full">
                  <Image
                    src={activeReel.posterImageUrl || "/images/mentor-spotlight.jpg"}
                    alt={activeReel.mentorName}
                    fill
                    className="object-cover opacity-50"
                  />
                  <div className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center text-white">
                    <Sparkles className="h-6 w-6 text-interlink-gold" />
                    <p className="mt-2 text-sm font-semibold">
                      Video stream unavailable in this network view
                    </p>
                    <p className="mt-1 max-w-md text-xs text-white/80">
                      {activeReel.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-display text-base font-semibold text-interlink-ink">
                  {activeReel.mentorName}
                </h4>
                <p className="text-xs text-interlink-muted">{activeReel.profession}</p>
              </div>
              <Badge tone="forest">{activeReel.topicTag}</Badge>
            </div>

            <div className="rounded-[2px] border border-interlink-border bg-interlink-app-bg px-3.5 py-2.5 text-xs text-interlink-ink">
              <span className="font-semibold text-interlink-forest">Career Path: </span>
              {activeReel.careerPath}
            </div>

            <p className="text-sm leading-relaxed text-interlink-muted">{activeReel.summary}</p>
          </div>
        )}
      </Modal>

      {/* Publish Reel Modal (Mentors & Admins) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Share a Mentor Motivational Reel"
        maxWidthClass="max-w-[560px]"
      >
        <form onSubmit={handlePublishReel} className="space-y-4">
          {formError && <ErrorAlert message={formError} />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Mentor Name"
              value={mentorName}
              onChange={(e) => setMentorName(e.target.value)}
              required
            />
            <Input
              label="Profession / Title"
              placeholder="e.g., Principal Product Manager"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              required
            />
          </div>
          <Input
            label="Career Path"
            placeholder="e.g., Intern -> Product Analyst -> Principal PM"
            value={careerPath}
            onChange={(e) => setCareerPath(e.target.value)}
            required
          />
          <Input
            label="Reel Title"
            placeholder="e.g., Navigating Your First Leadership Role"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            label="Key Takeaway / Summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            required
          />
          <Input
            label="Video URL (MP4 / WebM)"
            type="url"
            placeholder="https://..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Topic Tag"
              value={topicTag}
              onChange={(e) => setTopicTag(e.target.value)}
              required
            />
            <Input
              label="Duration"
              placeholder="0:45"
              value={durationLabel}
              onChange={(e) => setDurationLabel(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Publish Reel
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
