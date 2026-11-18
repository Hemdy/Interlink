"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { PublicMentorSummary, SessionUser } from "@interlink/types";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { UserAvatar } from "@/components/ui/UserAvatar";
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
  const [minExperience, setMinExperience] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"relevant" | "experience" | "newest">("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (industryId) count++;
    if (sessionPreference) count++;
    if (availability) count++;
    if (minExperience) count++;
    if (verifiedOnly) count++;
    if (sort !== "relevant") count++;
    return count;
  }, [industryId, sessionPreference, availability, minExperience, verifiedOnly, sort]);

  const comparedMentors = useMemo(
    () => mentors.filter((m) => compareIds.includes(m.userId)),
    [mentors, compareIds],
  );

  async function executeFilter(overrides?: {
    q?: string;
    industryId?: string;
    sessionPreference?: string;
    availability?: string;
    minExperience?: string;
    verifiedOnly?: boolean;
    sort?: "relevant" | "experience" | "newest";
  }) {
    setLoading(true);
    try {
      const activeQ = overrides?.q !== undefined ? overrides.q : q;
      const activeIndustryId =
        overrides?.industryId !== undefined ? overrides.industryId : industryId;
      const activeSessionPreference =
        overrides?.sessionPreference !== undefined
          ? overrides.sessionPreference
          : sessionPreference;
      const activeAvailability =
        overrides?.availability !== undefined ? overrides.availability : availability;
      const activeMinExperience =
        overrides?.minExperience !== undefined ? overrides.minExperience : minExperience;
      const activeVerifiedOnly =
        overrides?.verifiedOnly !== undefined ? overrides.verifiedOnly : verifiedOnly;
      const activeSort = overrides?.sort !== undefined ? overrides.sort : sort;

      const params = new URLSearchParams();
      if (activeQ.trim()) params.set("q", activeQ.trim());
      if (activeIndustryId) params.set("industryId", activeIndustryId);
      if (activeSessionPreference) params.set("sessionPreference", activeSessionPreference);
      if (activeAvailability) params.set("availability", activeAvailability);
      if (activeMinExperience) params.set("minExperience", activeMinExperience);
      if (activeVerifiedOnly) params.set("verifiedOnly", "true");
      params.set("sort", activeSort);
      params.set("limit", "50");

      const res = await fetch(`/api/v1/mentors?${params.toString()}`);
      const json = (await res.json()) as { data?: { mentors: PublicMentorSummary[] } };
      if (res.ok && json.data?.mentors) {
        setMentors(json.data.mentors);
      }
    } catch {
      pushToast({ kind: "error", title: "Unable to load filtered mentors." });
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    void executeFilter();
  }

  function handleIndustryChange(val: string) {
    setIndustryId(val);
    void executeFilter({ industryId: val });
  }

  function handleSessionPreferenceChange(val: string) {
    setSessionPreference(val);
    void executeFilter({ sessionPreference: val });
  }

  function handleAvailabilityChange(val: string) {
    setAvailability(val);
    void executeFilter({ availability: val });
  }

  function handleExperienceChange(val: string) {
    setMinExperience(val);
    void executeFilter({ minExperience: val });
  }

  function handleVerifiedChange(val: boolean) {
    setVerifiedOnly(val);
    void executeFilter({ verifiedOnly: val });
  }

  function handleSortChange(val: "relevant" | "experience" | "newest") {
    setSort(val);
    void executeFilter({ sort: val });
  }

  async function clearFilters() {
    setQ("");
    setIndustryId("");
    setSessionPreference("");
    setAvailability("");
    setMinExperience("");
    setVerifiedOnly(false);
    setSort("relevant");
    await executeFilter({
      q: "",
      industryId: "",
      sessionPreference: "",
      availability: "",
      minExperience: "",
      verifiedOnly: false,
      sort: "relevant",
    });
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
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-interlink-forest/10 text-interlink-forest">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="font-display text-lg font-semibold text-interlink-ink">
                Picked for Your Goals
              </h2>
            </div>
            <span className="text-[11px] font-medium text-interlink-muted">Swipe on mobile &rarr;</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {recommendedMentors.slice(0, 3).map((mentor) => (
              <Card
                key={mentor.userId}
                className="min-w-[270px] shrink-0 snap-start border-interlink-forest/35 bg-gradient-to-br from-interlink-surface to-interlink-forest/[0.04] p-5 shadow-subtle hover:-translate-y-0.5 hover:border-interlink-forest md:min-w-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      src={mentor.profileImage}
                      firstName={mentor.firstName}
                      lastName={mentor.lastName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-interlink-ink">
                        {mentor.firstName} {mentor.lastName}
                      </h3>
                      <p className="truncate text-xs text-interlink-muted">
                        {mentor.currentPosition}
                        {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                      </p>
                    </div>
                  </div>
                  {typeof mentor.matchScore === "number" && mentor.matchScore > 0 && (
                    <Badge tone="forest" className="shrink-0">{mentor.matchScore}% match</Badge>
                  )}
                </div>
                {mentor.matchReasons && mentor.matchReasons.length > 0 && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-interlink-muted">
                    {mentor.matchReasons[0]}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-interlink-border/50 pt-3">
                  <Link
                    href={`/mentors/${mentor.userId}`}
                    className="inline-flex items-center gap-1 rounded-full bg-interlink-forest/10 px-3.5 py-1.5 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
                  >
                    View Profile &rarr;
                  </Link>
                  <Link
                    href={`/mentors/${mentor.userId}#request`}
                    className="text-xs font-semibold text-interlink-muted hover:text-interlink-forest"
                  >
                    Connect
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search & Filter Panel */}
      <Card>
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-7">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, role, skill, or organisation..."
                aria-label="Search mentors"
              />
              {q.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    void executeFilter({ q: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-interlink-muted hover:text-interlink-ink"
                  aria-label="Clear search input"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="md:col-span-3">
              <Button
                type="button"
                variant={filtersOpen || activeFilterCount > 0 ? "secondary" : "outline"}
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-2 py-2.5 px-3.5 border-interlink-border shadow-subtle hover:border-interlink-forest"
                aria-expanded={filtersOpen}
                aria-controls="browse-mentors-filter-panel"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-interlink-forest" />
                  <span className="font-medium text-interlink-ink">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-interlink-forest px-1.5 text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </span>
                {filtersOpen ? (
                  <ChevronUp className="h-4 w-4 text-interlink-muted transition-transform" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-interlink-muted transition-transform" />
                )}
              </Button>
            </div>

            <div className="md:col-span-2">
              <Button type="submit" loading={loading} className="w-full py-2.5 font-semibold">
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
          </div>

          {/* Smooth Collapsible Filter Panel */}
          <div
            id="browse-mentors-filter-panel"
            className={`grid transition-all duration-300 ease-in-out ${
              filtersOpen
                ? "grid-rows-[1fr] opacity-100 border-t border-interlink-border/60 pt-4"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-interlink-muted">
                    Industry
                  </label>
                  <Select
                    aria-label="Industry"
                    value={industryId}
                    onChange={(e) => handleIndustryChange(e.target.value)}
                  >
                    <option value="">All Industries</option>
                    {industries.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-interlink-muted">
                    Session Format
                  </label>
                  <Select
                    aria-label="Session format"
                    value={sessionPreference}
                    onChange={(e) => handleSessionPreferenceChange(e.target.value)}
                  >
                    <option value="">Any Format</option>
                    <option value="online">Online</option>
                    <option value="in_person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-interlink-muted">
                    Availability
                  </label>
                  <Select
                    aria-label="Availability status"
                    value={availability}
                    onChange={(e) => handleAvailabilityChange(e.target.value)}
                  >
                    <option value="">Any Availability</option>
                    <option value="accepting">Accepting Mentees</option>
                    <option value="paused">Paused</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-interlink-muted">
                    Experience Level
                  </label>
                  <Select
                    aria-label="Minimum experience"
                    value={minExperience}
                    onChange={(e) => handleExperienceChange(e.target.value)}
                  >
                    <option value="">Any Experience</option>
                    <option value="1">1+ Years</option>
                    <option value="3">3+ Years</option>
                    <option value="5">5+ Years</option>
                    <option value="8">8+ Years</option>
                    <option value="10">10+ Years</option>
                  </Select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-interlink-border/40 pt-3.5">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[2px] border border-interlink-border bg-interlink-app-bg/50 px-3 py-1.5 text-xs font-medium text-interlink-ink transition-colors hover:border-interlink-forest">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => handleVerifiedChange(e.target.checked)}
                      className="h-3.5 w-3.5 accent-interlink-forest"
                    />
                    <ShieldCheck className="h-3.5 w-3.5 text-interlink-forest" />
                    Verified Mentors Only
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-interlink-muted whitespace-nowrap">Sort:</span>
                    <div className="w-44">
                      <Select
                        size="sm"
                        aria-label="Sort results"
                        value={sort}
                        onChange={(e) =>
                          handleSortChange(e.target.value as "relevant" | "experience" | "newest")
                        }
                      >
                        <option value="relevant">Most Relevant</option>
                        <option value="experience">Most Experienced</option>
                        <option value="newest">Recently Updated</option>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {compareIds.length >= 2 && (
                    <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
                      <GitCompareArrows className="h-3.5 w-3.5" /> Compare ({compareIds.length})
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-xs text-interlink-muted hover:text-interlink-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset all
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Industry & Trust Pill Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => handleIndustryChange("")}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                industryId === ""
                  ? "border-interlink-forest bg-interlink-forest text-white shadow-subtle"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              All Industries
            </button>
            <button
              type="button"
              onClick={() => handleVerifiedChange(!verifiedOnly)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                verifiedOnly
                  ? "border-interlink-forest bg-interlink-forest/15 text-interlink-forest"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Only
            </button>
            {industries.slice(0, 8).map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => handleIndustryChange(industryId === ind.id ? "" : ind.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  industryId === ind.id
                    ? "border-interlink-forest bg-interlink-forest text-white shadow-subtle"
                    : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
                }`}
              >
                {ind.name}
              </button>
            ))}
          </div>

          {/* Active Filter Chips & Results Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-interlink-border/40 pt-3 text-xs text-interlink-muted">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-semibold text-interlink-ink">
                {mentors.length} {mentors.length === 1 ? "mentor" : "mentors"} found
              </span>
              {q.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  Search: &ldquo;{q.trim()}&rdquo;
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      void executeFilter({ q: "" });
                    }}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {industryId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  {industries.find((i) => i.id === industryId)?.name ?? "Industry"}
                  <button
                    type="button"
                    onClick={() => handleIndustryChange("")}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove industry filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {sessionPreference && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  Format: {sessionPreference.replace("_", " ")}
                  <button
                    type="button"
                    onClick={() => handleSessionPreferenceChange("")}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove session format filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {availability && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  {availability === "accepting" ? "Accepting Mentees" : "Paused"}
                  <button
                    type="button"
                    onClick={() => handleAvailabilityChange("")}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove availability filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {minExperience && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  {minExperience}+ yrs exp
                  <button
                    type="button"
                    onClick={() => handleExperienceChange("")}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove experience filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {verifiedOnly && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  Verified Only
                  <button
                    type="button"
                    onClick={() => handleVerifiedChange(false)}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Remove verified filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {sort !== "relevant" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1 text-xs text-interlink-ink shadow-subtle">
                  Sort: {sort === "experience" ? "Most Experienced" : "Recently Updated"}
                  <button
                    type="button"
                    onClick={() => handleSortChange("relevant")}
                    className="text-interlink-muted hover:text-interlink-forest"
                    aria-label="Reset sort order"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-interlink-forest hover:underline"
              >
                Clear all
              </button>
            )}
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
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <UserAvatar
                          src={mentor.profileImage}
                          firstName={mentor.firstName}
                          lastName={mentor.lastName}
                          size="md"
                          previewable
                          previewSubtitle={
                            mentor.currentPosition
                              ? `${mentor.currentPosition}${mentor.organisation ? ` · ${mentor.organisation}` : ""}`
                              : undefined
                          }
                        />
                        {!isFull && (
                          <span
                            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-interlink-surface bg-emerald-500"
                            title="Accepting mentees"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-interlink-ink">
                          {mentor.firstName} {mentor.lastName}
                        </h3>
                        <p className="text-xs text-interlink-muted">
                          {mentor.currentPosition}
                          {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                        </p>
                      </div>
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

                <div className="mt-6 space-y-3 border-t border-interlink-border/60 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isFull ? "text-amber-600 dark:text-amber-400" : "text-interlink-forest"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isFull
                        ? "Waitlist / Full"
                        : `Open (${mentor.activeMenteeCount}/${mentor.maximumMentees} slots)`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompare(mentor.userId)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                          compareIds.includes(mentor.userId)
                            ? "border-interlink-forest bg-interlink-forest/10 text-interlink-forest"
                            : "border-interlink-border text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
                        }`}
                      >
                        {compareIds.includes(mentor.userId) ? "Comparing" : "Compare"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSave(mentor)}
                        aria-label={mentor.isSaved ? "Unsave mentor" : "Save mentor"}
                        className={`rounded-full border p-2 transition-colors ${
                          mentor.isSaved
                            ? "border-interlink-forest bg-interlink-forest/10 text-interlink-forest"
                            : "border-interlink-border text-interlink-muted hover:border-interlink-forest hover:text-interlink-forest"
                        }`}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${mentor.isSaved ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/mentors/${mentor.userId}`}
                      className="rounded-full border border-interlink-border py-2 text-center text-xs font-semibold text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/mentors/${mentor.userId}#request`}
                      className={`rounded-full py-2 text-center text-xs font-semibold transition-all active:scale-[0.98] ${
                        isFull
                          ? "bg-interlink-app-bg text-interlink-muted hover:text-interlink-ink"
                          : "bg-interlink-forest text-white hover:bg-interlink-forest-hover"
                      }`}
                    >
                      {isFull ? "View Details" : "Connect"}
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
              <div key={m.userId} className="rounded-2xl border border-interlink-border bg-interlink-app-bg/40 p-4">
                <h3 className="font-semibold text-interlink-ink">
                  {m.firstName} {m.lastName}
                </h3>
                <p className="text-xs text-interlink-muted">{m.currentPosition}</p>
                <dl className="mt-4 space-y-2 text-xs">
                  <div>
                    <dt className="font-medium text-interlink-muted">Industry</dt>
                    <dd className="text-interlink-ink">{m.industryName ?? "General"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-interlink-muted">Experience</dt>
                    <dd className="text-interlink-ink">{m.yearsOfExperience} years</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-interlink-muted">Verification</dt>
                    <dd className="capitalize text-interlink-ink">{m.verificationStatus}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-interlink-muted">Session Format</dt>
                    <dd className="capitalize text-interlink-ink">
                      {m.sessionPreference.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-interlink-muted">Expertise</dt>
                    <dd className="text-interlink-ink">{m.expertiseTags.join(", ")}</dd>
                  </div>
                </dl>
                <Link
                  href={`/mentors/${m.userId}`}
                  className="mt-4 block rounded-full bg-interlink-forest py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-interlink-forest-hover"
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
