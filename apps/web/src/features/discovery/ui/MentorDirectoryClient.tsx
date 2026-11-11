"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  CheckCircle2,
  GitCompareArrows,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import type { PublicMentorSummary, SessionUser } from "@interlink/types";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuthModal } from "@/features/auth/ui/AuthModalProvider";

interface IndustryOption {
  id: string;
  name: string;
}

export function MentorDirectoryClient({
  initialMentors,
  recommendedMentors,
  industries,
  user,
}: {
  initialMentors: PublicMentorSummary[];
  recommendedMentors: PublicMentorSummary[];
  industries: IndustryOption[];
  user: SessionUser | null;
}) {
  const { pushToast } = useToast();
  const { openSignIn } = useAuthModal();
  const [mentors, setMentors] = useState<PublicMentorSummary[]>(initialMentors);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [sessionPreference, setSessionPreference] = useState("");
  const [availability, setAvailability] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"relevant" | "experience" | "newest">("relevant");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const comparedMentors = useMemo(
    () => mentors.filter((m) => compareIds.includes(m.userId)),
    [mentors, compareIds],
  );

  async function runSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (industryId) params.set("industryId", industryId);
      if (sessionPreference) params.set("sessionPreference", sessionPreference);
      if (availability) params.set("availability", availability);
      if (verifiedOnly) params.set("verifiedOnly", "true");
      params.set("sort", sort);

      const res = await fetch(`/api/v1/mentors?${params.toString()}`);
      const json = (await res.json()) as { data?: { mentors: PublicMentorSummary[] } };
      if (res.ok && json.data) {
        setMentors(json.data.mentors);
      }
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setQ("");
    setIndustryId("");
    setSessionPreference("");
    setAvailability("");
    setVerifiedOnly(false);
    setSort("relevant");
    setMentors(initialMentors);
  }

  async function toggleSave(mentor: PublicMentorSummary) {
    if (!user) {
      openSignIn();
      return;
    }

    const method = mentor.isSaved ? "DELETE" : "POST";
    const res = await fetch(`/api/v1/mentors/${mentor.userId}/save`, { method });
    if (res.ok) {
      setMentors((prev) =>
        prev.map((m) =>
          m.userId === mentor.userId ? { ...m, isSaved: !mentor.isSaved } : m,
        ),
      );
      pushToast({
        kind: "success",
        title: mentor.isSaved ? "Removed from saved mentors" : "Mentor saved",
      });
    } else {
      pushToast({ kind: "error", title: "Unable to update saved mentor" });
    }
  }

  function toggleCompare(mentorId: string) {
    setCompareIds((prev) => {
      if (prev.includes(mentorId)) return prev.filter((id) => id !== mentorId);
      if (prev.length >= 3) {
        pushToast({ kind: "info", title: "You can compare up to 3 mentors at a time." });
        return prev;
      }
      return [...prev, mentorId];
    });
  }

  return (
    <div className="space-y-8">
      {/* Recommended Mentors Strip (when logged in & recommendations exist) */}
      {user && recommendedMentors.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-interlink-forest" />
            <h2 className="font-display text-lg font-semibold text-interlink-ink">
              Recommended for Your Goals
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recommendedMentors.slice(0, 3).map((mentor) => (
              <Card key={mentor.userId} className="border-interlink-forest/30 bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-interlink-ink">
                      {mentor.firstName} {mentor.lastName}
                    </h3>
                    <p className="text-xs text-interlink-muted">
                      {mentor.currentPosition}
                      {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                    </p>
                  </div>
                  {typeof mentor.matchScore === "number" && mentor.matchScore > 0 && (
                    <Badge tone="forest">{mentor.matchScore}% match</Badge>
                  )}
                </div>
                {mentor.matchReasons && mentor.matchReasons.length > 0 && (
                  <p className="mt-2.5 text-xs text-slate-600">{mentor.matchReasons[0]}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/mentors/${mentor.userId}`}
                    className="text-xs font-semibold text-interlink-forest hover:underline"
                  >
                    View Profile &rarr;
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Panel */}
      <Card>
        <form onSubmit={runSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, role, skill, or organisation..."
                aria-label="Search mentors"
              />
            </div>

            <div className="md:col-span-3">
              <Select
                aria-label="Industry"
                value={industryId}
                onChange={(e) => setIndustryId(e.target.value)}
              >
                <option value="">All Industries</option>
                {industries.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select
                aria-label="Session format"
                value={sessionPreference}
                onChange={(e) => setSessionPreference(e.target.value)}
              >
                <option value="">Any Format</option>
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" loading={loading} className="w-full py-2.5">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-interlink-border/60 pt-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-interlink-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters:
              </span>
              <div className="w-44">
                <Select
                  size="sm"
                  aria-label="Availability status"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="">Any Availability</option>
                  <option value="accepting">Accepting Mentees</option>
                  <option value="paused">Paused</option>
                </Select>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-interlink-ink">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="accent-interlink-forest"
                />
                Verified Mentors Only
              </label>

              <div className="w-48">
                <Select
                  size="sm"
                  aria-label="Sort results"
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value as "relevant" | "experience" | "newest")
                  }
                >
                  <option value="relevant">Sort: Most Relevant</option>
                  <option value="experience">Sort: Most Experienced</option>
                  <option value="newest">Sort: Recently Updated</option>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {compareIds.length >= 2 && (
                <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
                  <GitCompareArrows className="h-3.5 w-3.5" /> Compare ({compareIds.length})
                </Button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-interlink-muted hover:text-interlink-ink"
              >
                Reset filters
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* Results grid */}
      {mentors.length === 0 ? (
        <EmptyState
          title="No mentors match your current criteria"
          description="Try broadening your search filters, or invite experienced professionals in your network to join Interlink."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
              {!user && (
                <Button onClick={() => openSignIn()}>Become a Mentor</Button>
              )}
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => {
            const isFull =
              mentor.availabilityStatus !== "accepting" ||
              mentor.activeMenteeCount >= mentor.maximumMentees;

            return (
              <Card
                key={mentor.userId}
                elevated
                className="flex flex-col justify-between hover:-translate-y-0.5 hover:border-interlink-forest/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-interlink-ink">
                        {mentor.firstName} {mentor.lastName}
                      </h3>
                      <p className="text-xs text-interlink-muted">
                        {mentor.currentPosition}
                        {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                      </p>
                    </div>
                    <Badge
                      tone={
                        mentor.verificationStatus === "verified"
                          ? "forest"
                          : mentor.verificationStatus === "reviewed"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {mentor.verificationStatus === "verified" && (
                        <ShieldCheck className="h-3 w-3" />
                      )}
                      {mentor.verificationStatus === "verified"
                        ? "Verified"
                        : mentor.verificationStatus === "reviewed"
                          ? "Reviewed"
                          : "Registered"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-interlink-muted">
                    {mentor.industryName && <span>{mentor.industryName}</span>}
                    <span>&middot; {mentor.yearsOfExperience} yrs exp</span>
                    {mentor.location && (
                      <span className="inline-flex items-center gap-0.5">
                        &middot; <MapPin className="h-3 w-3" /> {mentor.location}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-interlink-muted">
                    {mentor.biography}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {mentor.expertiseTags.slice(0, 4).map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        isFull ? "text-amber-700" : "text-interlink-forest"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isFull
                        ? "Currently Unavailable"
                        : `Accepting (${mentor.activeMenteeCount}/${mentor.maximumMentees} slots)`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompare(mentor.userId)}
                        className={`rounded-[2px] border px-2 py-1 text-[11px] ${
                          compareIds.includes(mentor.userId)
                            ? "border-interlink-forest bg-interlink-forest/10 text-interlink-forest"
                            : "border-slate-200 text-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {compareIds.includes(mentor.userId) ? "Comparing" : "Compare"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSave(mentor)}
                        aria-label={mentor.isSaved ? "Unsave mentor" : "Save mentor"}
                        className={`rounded-[2px] border p-1.5 ${
                          mentor.isSaved
                            ? "border-interlink-forest bg-interlink-forest/10 text-interlink-forest"
                            : "border-slate-200 text-slate-500 hover:text-interlink-forest"
                        }`}
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/mentors/${mentor.userId}`}
                      className="rounded-[2px] border border-interlink-hairline py-2 text-center text-xs font-medium text-interlink-ink hover:border-interlink-forest hover:text-interlink-forest"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/mentors/${mentor.userId}#request`}
                      className={`rounded-[2px] py-2 text-center text-xs font-medium ${
                        isFull
                          ? "bg-slate-200 text-slate-500"
                          : "bg-interlink-forest text-white hover:bg-interlink-forest-hover"
                      }`}
                    >
                      {isFull ? "View Details" : "Request Mentorship"}
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Compare Mentors Modal (FR-DISC-11) */}
      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title="Compare Mentors"
        maxWidthClass="max-w-4xl"
      >
        <div className="bg-interlink-surface p-6 text-interlink-ink sm:p-8">
          <h2 className="font-display text-xl font-semibold text-interlink-ink">
            Mentor Comparison
          </h2>
          <p className="mt-1 text-xs text-interlink-muted">
            Evaluate expertise, experience, verification, and session availability side by side.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {comparedMentors.map((m) => (
              <div key={m.userId} className="rounded-[2px] border border-slate-200 p-4">
                <h3 className="font-semibold text-interlink-ink">
                  {m.firstName} {m.lastName}
                </h3>
                <p className="text-xs text-interlink-muted">{m.currentPosition}</p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div>
                    <dt className="font-medium text-slate-500">Industry</dt>
                    <dd className="text-interlink-ink">{m.industryName ?? "General"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Experience</dt>
                    <dd className="text-interlink-ink">{m.yearsOfExperience} years</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Verification</dt>
                    <dd className="capitalize text-interlink-ink">{m.verificationStatus}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Session Format</dt>
                    <dd className="capitalize text-interlink-ink">
                      {m.sessionPreference.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Expertise</dt>
                    <dd className="text-interlink-ink">{m.expertiseTags.join(", ")}</dd>
                  </div>
                </dl>
                <Link
                  href={`/mentors/${m.userId}`}
                  className="mt-4 block rounded-[2px] bg-interlink-forest py-1.5 text-center text-xs font-medium text-white"
                >
                  Open Profile
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
