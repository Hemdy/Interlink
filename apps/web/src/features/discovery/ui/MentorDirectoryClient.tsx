"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Bookmark,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { PublicMentorSummary, SessionUser } from "@interlink/types";
import { MentorCardGridSkeleton } from "@/components/layout/PageSkeletons";
import { Badge, Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveAvatarSrc, UserAvatar } from "@/components/ui/UserAvatar";
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
  const [pricingFilter, setPricingFilter] = useState<"all" | "free" | "paid">("all");
  const [sort, setSort] = useState<"relevant" | "experience" | "newest">("relevant");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (industryId) count++;
    if (sessionPreference) count++;
    if (availability) count++;
    if (minExperience) count++;
    if (verifiedOnly) count++;
    if (pricingFilter !== "all") count++;
    if (sort !== "relevant") count++;
    return count;
  }, [industryId, sessionPreference, availability, minExperience, verifiedOnly, pricingFilter, sort]);

  const comparedMentors = useMemo(
    () => mentors.filter((m) => compareIds.includes(m.userId)),
    [mentors, compareIds],
  );

  async function executeFilter(overrides?: {
    q?: string;
    industryId?: string;
    sessionPreference?: string;
    availability?: string;
    pricing?: "all" | "free" | "paid";
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
      const activePricing =
        overrides?.pricing !== undefined ? overrides.pricing : pricingFilter;
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
      if (activePricing !== "all") params.set("pricing", activePricing);
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

  function handlePricingChange(val: "all" | "free" | "paid") {
    setPricingFilter(val);
    void executeFilter({ pricing: val });
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
    setPricingFilter("all");
    setMinExperience("");
    setVerifiedOnly(false);
    setSort("relevant");
    await executeFilter({
      q: "",
      industryId: "",
      sessionPreference: "",
      availability: "",
      pricing: "all",
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

    const nextSaved = !mentor.isSaved;
    const method = mentor.isSaved ? "DELETE" : "POST";

    // Optimistically update bookmark state immediately
    setMentors((prev) =>
      prev.map((m) => (m.userId === mentor.userId ? { ...m, isSaved: nextSaved } : m)),
    );
    pushToast({
      kind: "success",
      title: nextSaved ? "Mentor saved" : "Removed from saved mentors",
    });

    try {
      const res = await fetch(`/api/v1/mentors/${mentor.userId}/save`, { method });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setMentors((prev) =>
        prev.map((m) => (m.userId === mentor.userId ? { ...m, isSaved: !nextSaved } : m)),
      );
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
            <button
              type="button"
              onClick={() => handlePricingChange(pricingFilter === "free" ? "all" : "free")}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                pricingFilter === "free"
                  ? "border-interlink-forest bg-interlink-forest/15 text-interlink-forest"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              Free Available
            </button>
            <button
              type="button"
              onClick={() => handlePricingChange(pricingFilter === "paid" ? "all" : "paid")}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                pricingFilter === "paid"
                  ? "border-interlink-forest bg-interlink-forest/15 text-interlink-forest"
                  : "border-interlink-border bg-interlink-surface text-interlink-muted hover:border-interlink-forest hover:text-interlink-ink"
              }`}
            >
              Paid Packages
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
      {loading ? (
        <MentorCardGridSkeleton count={mentors.length > 0 ? Math.min(mentors.length, 6) : 6} />
      ) : mentors.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => {
            const isFull =
              mentor.availabilityStatus !== "accepting" ||
              mentor.activeMenteeCount >= mentor.maximumMentees;
            const resolvedPhoto = resolveAvatarSrc(mentor.profileImage);
            const showPhoto = Boolean(resolvedPhoto && !failedImages[mentor.userId]);
            const initials =
              `${mentor.firstName[0] ?? ""}${mentor.lastName[0] ?? ""}`.toUpperCase() || "M";

            return (
              <article
                key={mentor.userId}
                className="group relative flex min-h-[345px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#1b3324] via-[#112118] to-[#0a120d] shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated sm:min-h-[370px]"
              >
                {/* Portrait / Monogram Backdrop */}
                <Link
                  href={`/mentors/${mentor.userId}`}
                  aria-label={`View ${mentor.firstName} ${mentor.lastName}'s profile`}
                  className="absolute inset-0 block focus-ring"
                >
                  {showPhoto && resolvedPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedPhoto}
                      alt={`${mentor.firstName} ${mentor.lastName}`}
                      loading="eager"
                      decoding="async"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [mentor.userId]: true }))
                      }
                      className="h-full w-full object-cover object-[50%_20%] transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-start justify-center bg-[radial-gradient(circle_at_50%_26%,rgba(108,150,126,0.38),rgba(17,33,24,0.95)_64%)] pt-14">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 font-display text-2xl font-semibold tracking-tight text-white shadow-lg backdrop-blur-md">
                        {initials}
                      </div>
                    </div>
                  )}

                  {/* Smooth frosted dissolve confined to lower half */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] backdrop-blur-md [mask-image:linear-gradient(to_top,black_45%,transparent_100%)]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08110c]/[0.95] via-[#0d1b13]/75 via-38% to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/25 to-transparent"
                  />
                </Link>

                {/* Minimal Top Controls */}
                <div className="relative z-10 flex items-center justify-between gap-2 p-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-md">
                      <Award className="h-3.5 w-3.5 shrink-0 text-[#e5b869]" aria-hidden="true" />
                      <span>{mentor.yearsOfExperience}+ yrs</span>
                    </span>

                    <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-md">
                      {(() => {
                        if (mentor.pricingMode === "free") return "Free";
                        const minRate = [
                          mentor.hourlyRateNgn,
                          mentor.sessionRateNgn,
                          mentor.monthlyRateNgn,
                        ].filter((r): r is number => typeof r === "number" && r > 0);
                        const lowest = minRate.length > 0 ? Math.min(...minRate) : null;
                        if (mentor.pricingMode === "hybrid" && lowest) {
                          return `Free · ₦${lowest.toLocaleString("en-NG")}+`;
                        }
                        return lowest ? `₦${lowest.toLocaleString("en-NG")}+` : "Paid";
                      })()}
                    </span>

                    {typeof mentor.matchScore === "number" && mentor.matchScore > 0 && (
                      <span className="rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                        {mentor.matchScore}% Match
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleCompare(mentor.userId)}
                      aria-label={
                        compareIds.includes(mentor.userId)
                          ? "Remove from comparison"
                          : "Compare mentor"
                      }
                      title={
                        compareIds.includes(mentor.userId) ? "Comparing" : "Compare mentor"
                      }
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                        compareIds.includes(mentor.userId)
                          ? "bg-interlink-forest text-white shadow-sm"
                          : "bg-black/35 text-white/90 hover:bg-black/55"
                      }`}
                    >
                      <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSave(mentor)}
                      aria-label={mentor.isSaved ? "Unsave mentor" : "Save mentor"}
                      title={mentor.isSaved ? "Saved" : "Save mentor"}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
                        mentor.isSaved
                          ? "bg-interlink-forest text-white shadow-sm"
                          : "bg-black/35 text-white/90 hover:bg-black/55"
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${mentor.isSaved ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Essential Frosted Overlay Summary */}
                <div className="relative z-10 flex flex-col gap-1.5 px-4 pb-4 pt-24 sm:pt-28">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/mentors/${mentor.userId}`}
                      className="truncate font-display text-lg font-semibold leading-tight text-white transition-colors hover:text-emerald-200 focus-ring"
                    >
                      {mentor.firstName} {mentor.lastName}
                    </Link>
                    {mentor.verificationStatus === "verified" ? (
                      <BadgeCheck
                        className="h-5 w-5 shrink-0 fill-emerald-400 text-[#08120c]"
                        aria-label="Verified Mentor"
                      />
                    ) : mentor.verificationStatus === "reviewed" ? (
                      <BadgeCheck
                        className="h-5 w-5 shrink-0 fill-sky-400 text-[#08120c]"
                        aria-label="Reviewed Profile"
                      />
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <p className="min-w-0 truncate font-medium text-emerald-100/85">
                      {mentor.currentPosition}
                      {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 font-semibold ${
                        isFull ? "text-amber-200" : "text-emerald-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isFull ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span>{isFull ? "Waitlist" : "Accepting"}</span>
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-white/75">
                    {mentor.biography}
                  </p>

                  {/* Clean Action Separation: View Profile vs Connect CTA */}
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium text-white/75"
                        title="Active mentees"
                      >
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{mentor.activeMenteeCount}</span>
                      </span>
                      <Link
                        href={`/mentors/${mentor.userId}`}
                        className="text-xs font-semibold text-white/95 underline-offset-4 transition-colors hover:text-emerald-200 hover:underline focus-ring"
                      >
                        View Profile
                      </Link>
                    </div>

                    <Link
                      href={`/mentors/${mentor.userId}#request`}
                      className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-[0.97] focus-ring ${
                        isFull
                          ? "bg-white/15 text-white hover:bg-white/25"
                          : "bg-white text-[#0e1e15] shadow-[0_6px_18px_rgba(0,0,0,0.28)] hover:bg-emerald-50"
                      }`}
                    >
                      <span>{isFull ? "Details" : "Connect"}</span>
                      {!isFull && <Plus className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />}
                    </Link>
                  </div>
                </div>
              </article>
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
