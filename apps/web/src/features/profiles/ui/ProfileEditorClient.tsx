"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { calculateMentorshipSplit, type MentorshipPricingMode } from "@interlink/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { MediaDropzone } from "@/components/ui/media/MediaDropzone";
import { useToast } from "@/components/ui/ToastProvider";
import { AvatarUploadCard } from "@/features/profiles/ui/AvatarUploadCard";

interface IndustryOption {
  id: string;
  name: string;
}

export function ProfileEditorClient({
  role,
  industries,
  initialMentor,
  initialMentee,
  initialSlots = [],
  isOnboarding = false,
  userFirstName = "",
  userLastName = "",
  initialProfileImage = null,
  onProfileImageChange,
}: {
  role: "mentor" | "mentee";
  industries: IndustryOption[];
  userFirstName?: string;
  userLastName?: string;
  initialProfileImage?: string | null;
  onProfileImageChange?: (url: string | null) => void;
  initialMentor?: {
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
  initialMentee?: {
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
  initialSlots?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    timezone: string;
    isActive: boolean;
  }>;
  isOnboarding?: boolean;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadedDocKey, setUploadedDocKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mentor form state
  const [currentPosition, setCurrentPosition] = useState(initialMentor?.currentPosition ?? "");
  const [organisation, setOrganisation] = useState(initialMentor?.organisation ?? "");
  const [industryId, setIndustryId] = useState(
    initialMentor?.industryId ?? initialMentee?.industryInterestId ?? "",
  );
  const [yearsOfExperience, setYearsOfExperience] = useState(
    String(initialMentor?.yearsOfExperience ?? 3),
  );
  const [biography, setBiography] = useState(initialMentor?.biography ?? "");
  const [qualifications, setQualifications] = useState(initialMentor?.qualifications ?? "");
  const [expertiseText, setExpertiseText] = useState(
    initialMentor?.expertiseAreas.join(", ") ?? "",
  );
  const [mentorSkillsText, setMentorSkillsText] = useState(
    initialMentor?.skills.join(", ") ?? "",
  );
  const [languagesText, setLanguagesText] = useState(
    initialMentor?.languages.join(", ") ?? "English",
  );
  const [location, setLocation] = useState(
    initialMentor?.location ?? initialMentee?.location ?? "",
  );
  const [linkedinUrl, setLinkedinUrl] = useState(initialMentor?.linkedinUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(initialMentor?.portfolioUrl ?? "");
  const [mentorshipApproach, setMentorshipApproach] = useState(
    initialMentor?.mentorshipApproach ?? "",
  );
  const [sessionPreference, setSessionPreference] = useState<"online" | "in_person" | "hybrid">(
    initialMentor?.sessionPreference ?? initialMentee?.sessionPreference ?? "online",
  );
  const [availabilityStatus, setAvailabilityStatus] = useState<"accepting" | "paused" | "full">(
    initialMentor?.availabilityStatus ?? "accepting",
  );
  const [maximumMentees, setMaximumMentees] = useState(
    String(initialMentor?.maximumMentees ?? 3),
  );
  const [pricingMode, setPricingMode] = useState<MentorshipPricingMode>(
    initialMentor?.pricingMode ?? "free",
  );
  const [hourlyRateNgn, setHourlyRateNgn] = useState(
    initialMentor?.hourlyRateNgn ? String(initialMentor.hourlyRateNgn) : "",
  );
  const [sessionRateNgn, setSessionRateNgn] = useState(
    initialMentor?.sessionRateNgn ? String(initialMentor.sessionRateNgn) : "",
  );
  const [monthlyRateNgn, setMonthlyRateNgn] = useState(
    initialMentor?.monthlyRateNgn ? String(initialMentor.monthlyRateNgn) : "",
  );
  const [visibility, setVisibility] = useState<"public" | "members_only" | "private">(
    initialMentor?.visibility ?? initialMentee?.visibility ?? "public",
  );
  const [verificationNotes, setVerificationNotes] = useState("");

  // Mentor availability slots
  const [slots, setSlots] = useState(
    initialSlots.length > 0
      ? initialSlots
      : [{ dayOfWeek: 6, startTime: "10:00", endTime: "12:00", timezone: "Africa/Lagos", isActive: true }],
  );

  // Mentee form state
  const [education, setEducation] = useState(initialMentee?.education ?? "");
  const [currentOccupation, setCurrentOccupation] = useState(
    initialMentee?.currentOccupation ?? "",
  );
  const [careerInterestsText, setCareerInterestsText] = useState(
    initialMentee?.careerInterests.join(", ") ?? "",
  );
  const [careerAspirations, setCareerAspirations] = useState(
    initialMentee?.careerAspirations ?? "",
  );
  const [existingSkillsText, setExistingSkillsText] = useState(
    initialMentee?.existingSkills.join(", ") ?? "",
  );
  const [skillsToDevelopText, setSkillsToDevelopText] = useState(
    initialMentee?.skillsToDevelop.join(", ") ?? "",
  );
  const [currentChallenges, setCurrentChallenges] = useState(
    initialMentee?.currentChallenges ?? "",
  );
  const [mentorshipExpectations, setMentorshipExpectations] = useState(
    initialMentee?.mentorshipExpectations ?? "",
  );
  const [preferredLanguage, setPreferredLanguage] = useState(
    initialMentee?.preferredLanguage ?? "English",
  );

  function splitCsv(val: string): string[] {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function saveProfile(e: React.FormEvent, markComplete = true) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (role === "mentor") {
        const res = await fetch("/api/v1/mentors/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            biography,
            currentPosition,
            organisation: organisation || null,
            industryId: industryId || null,
            yearsOfExperience: Number.parseInt(yearsOfExperience, 10) || 0,
            qualifications: qualifications || null,
            expertiseAreas: splitCsv(expertiseText),
            skills: splitCsv(mentorSkillsText),
            languages: splitCsv(languagesText),
            location: location || null,
            linkedinUrl: linkedinUrl || null,
            portfolioUrl: portfolioUrl || null,
            mentorshipApproach: mentorshipApproach || null,
            sessionPreference,
            availabilityStatus,
            maximumMentees: Number.parseInt(maximumMentees, 10) || 3,
            pricingMode,
            offersFreeMentorship: pricingMode !== "paid",
            hourlyRateNgn:
              pricingMode === "free" || !hourlyRateNgn.trim()
                ? null
                : Number.parseInt(hourlyRateNgn, 10) || null,
            sessionRateNgn:
              pricingMode === "free" || !sessionRateNgn.trim()
                ? null
                : Number.parseInt(sessionRateNgn, 10) || null,
            monthlyRateNgn:
              pricingMode === "free" || !monthlyRateNgn.trim()
                ? null
                : Number.parseInt(monthlyRateNgn, 10) || null,
            visibility,
            onboardingCompleted: markComplete,
            verificationNotes: verificationNotes || null,
          }),
        });
        const json = (await res.json()) as { error?: { message: string } };
        if (!res.ok) {
          setError(json.error?.message ?? "Unable to save mentor profile.");
          return;
        }
      } else {
        const res = await fetch("/api/v1/mentees/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            education: education || null,
            currentOccupation,
            industryInterestId: industryId || null,
            careerInterests: splitCsv(careerInterestsText),
            careerAspirations,
            existingSkills: splitCsv(existingSkillsText),
            skillsToDevelop: splitCsv(skillsToDevelopText),
            currentChallenges: currentChallenges || null,
            mentorshipExpectations: mentorshipExpectations || null,
            preferredLanguage,
            sessionPreference,
            location: location || null,
            visibility,
            onboardingCompleted: markComplete,
          }),
        });
        const json = (await res.json()) as { error?: { message: string } };
        if (!res.ok) {
          setError(json.error?.message ?? "Unable to save mentee profile.");
          return;
        }
      }

      pushToast({
        kind: "success",
        title: isOnboarding ? "Onboarding saved!" : "Profile updated",
      });
      router.push(isOnboarding ? "/dashboard" : "/profile");
      router.refresh();
    } catch {
      setError("Network error saving profile.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAvailabilitySlots() {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/mentors/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus,
          maximumMentees: Number.parseInt(maximumMentees, 10) || 3,
          slots,
        }),
      });
      if (res.ok) {
        pushToast({ kind: "success", title: "Availability schedule updated" });
        router.refresh();
      } else {
        pushToast({ kind: "error", title: "Unable to save availability" });
      }
    } finally {
      setSaving(false);
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const completionPct =
    role === "mentor"
      ? (initialMentor?.profileCompletion ?? 0)
      : (initialMentee?.profileCompletion ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Overview Card */}
      <Card className="bg-gradient-to-br from-interlink-forest/[0.06] via-interlink-surface to-interlink-surface">
        <AvatarUploadCard
          firstName={userFirstName}
          lastName={userLastName}
          initialProfileImage={initialProfileImage}
          onUploaded={(newUrl) => onProfileImageChange?.(newUrl)}
          onRemoved={() => onProfileImageChange?.(null)}
          compact
          besideSlot={
            <div className="w-full max-w-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-interlink-muted">Profile strength</span>
                <span className="font-semibold text-interlink-forest">{completionPct}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-interlink-app-bg">
                <div
                  className="h-full rounded-full bg-interlink-forest transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(8, completionPct))}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] capitalize text-interlink-muted">
                {role} profile &middot;{" "}
                {visibility === "public"
                  ? "Public"
                  : visibility === "members_only"
                    ? "Members only"
                    : "Private"}
              </p>
            </div>
          }
        />

        {/* Category Jump Pills */}
        <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pt-1">
          {[
            { label: "Identity", href: "#profile-identity" },
            { label: role === "mentor" ? "Story & Approach" : "Goals & Story", href: "#profile-story" },
            { label: "Skills & Languages", href: "#profile-skills" },
            { label: role === "mentor" ? "Privacy & Verification" : "Preferences & Privacy", href: "#profile-visibility" },
            ...(role === "mentor" ? [{ label: "Availability", href: "#availability" }] : []),
          ].map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className="shrink-0 rounded-full bg-interlink-app-bg px-3.5 py-1.5 text-xs font-medium text-interlink-ink transition-colors hover:bg-interlink-forest/10 hover:text-interlink-forest"
            >
              {tab.label}
            </a>
          ))}
        </div>
      </Card>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={(e) => saveProfile(e, true)} className="space-y-5">
        {/* Section 1: Identity & Background */}
        <Card id="profile-identity">
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              Identity &amp; Background
            </h2>
            <p className="mt-0.5 text-xs text-interlink-muted">
              Your headline role, industry focus, and location.
            </p>
          </div>

          {role === "mentor" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Current Position"
                  placeholder="e.g., Principal Software Engineer"
                  value={currentPosition}
                  onChange={(e) => setCurrentPosition(e.target.value)}
                  required
                />
                <Input
                  label="Organisation / Company"
                  placeholder="e.g., Paystack"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select
                  label="Primary Industry"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                >
                  <option value="">Select Industry</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Years of Experience"
                  type="number"
                  min={0}
                  max={70}
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  required
                />
                <Input
                  label="Location"
                  placeholder="e.g., Lagos, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Current Occupation or Study Status"
                  placeholder="e.g., Final-year Computer Science Student"
                  value={currentOccupation}
                  onChange={(e) => setCurrentOccupation(e.target.value)}
                  required
                />
                <Input
                  label="Educational Background"
                  placeholder="e.g., B.Sc. Economics, University of Lagos"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Target Industry"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                >
                  <option value="">Select Industry</option>
                  {industries.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Location"
                  placeholder="e.g., Abuja, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Section 2: Story & Mentorship Style (Subtle Background Variation) */}
        <Card id="profile-story" className="bg-interlink-app-bg/55">
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              {role === "mentor" ? "Story & Mentorship Approach" : "Goals & Story"}
            </h2>
            <p className="mt-0.5 text-xs text-interlink-muted">
              {role === "mentor"
                ? "Help mentees understand your journey and how you work together."
                : "Share what you're aiming for so mentors can guide you effectively."}
            </p>
          </div>

          {role === "mentor" ? (
            <div className="space-y-4">
              <Textarea
                label="Professional Biography"
                placeholder="Share your career journey, key achievements, and how you support emerging talent..."
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                required
                rows={4}
              />
              <Textarea
                label="Mentorship Approach"
                placeholder="Describe your mentoring style, expectations, and cadence..."
                value={mentorshipApproach}
                onChange={(e) => setMentorshipApproach(e.target.value)}
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                label="Career Aspirations"
                placeholder="Where do you want to be in the next 1–3 years?"
                value={careerAspirations}
                onChange={(e) => setCareerAspirations(e.target.value)}
                required
                rows={3}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Textarea
                  label="Current Challenges"
                  placeholder="What obstacles or skill gaps are you facing?"
                  value={currentChallenges}
                  onChange={(e) => setCurrentChallenges(e.target.value)}
                  rows={3}
                />
                <Textarea
                  label="Mentorship Expectations"
                  placeholder="What kind of guidance and accountability works best for you?"
                  value={mentorshipExpectations}
                  onChange={(e) => setMentorshipExpectations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Section 3: Skills, Interests & Languages */}
        <Card id="profile-skills">
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              Skills &amp; Languages
            </h2>
            <p className="mt-0.5 text-xs text-interlink-muted">
              Used to improve compatibility matching across the feed and directory.
            </p>
          </div>

          {role === "mentor" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Areas of Expertise (comma-separated)"
                  placeholder="Frontend Architecture, Career Transition, System Design"
                  value={expertiseText}
                  onChange={(e) => setExpertiseText(e.target.value)}
                  required
                />
                <Input
                  label="Core Skills (comma-separated)"
                  placeholder="TypeScript, React, Technical Leadership"
                  value={mentorSkillsText}
                  onChange={(e) => setMentorSkillsText(e.target.value)}
                />
              </div>
              <Input
                label="Spoken Languages (comma-separated)"
                value={languagesText}
                onChange={(e) => setLanguagesText(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Career Interests (comma-separated)"
                placeholder="Frontend Development, Product Management, Data Analytics"
                value={careerInterestsText}
                onChange={(e) => setCareerInterestsText(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Existing Skills"
                  placeholder="HTML, CSS, Communication"
                  value={existingSkillsText}
                  onChange={(e) => setExistingSkillsText(e.target.value)}
                />
                <Input
                  label="Skills to Develop"
                  placeholder="React, System Design"
                  value={skillsToDevelopText}
                  onChange={(e) => setSkillsToDevelopText(e.target.value)}
                />
                <Input
                  label="Preferred Language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </Card>

        {/* Section 4: Preferences, Links & Verification (Subtle Background Variation) */}
        <Card id="profile-visibility" className="bg-interlink-app-bg/55">
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold text-interlink-ink">
              {role === "mentor" ? "Preferences, Links & Verification" : "Session & Privacy Preferences"}
            </h2>
            <p className="mt-0.5 text-xs text-interlink-muted">
              Manage how you meet and who can discover your profile.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label={role === "mentor" ? "Session Preference" : "Preferred Session Format"}
                value={sessionPreference}
                onChange={(e) =>
                  setSessionPreference(e.target.value as "online" | "in_person" | "hybrid")
                }
              >
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </Select>
              <Select
                label="Profile Visibility"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as "public" | "members_only" | "private")
                }
              >
                <option value="public">
                  {role === "mentor" ? "Public (Directory)" : "Public"}
                </option>
                <option value="members_only">
                  {role === "mentor" ? "Signed-in Members Only" : "Mentors & Members Only"}
                </option>
                <option value="private">Private (Hidden)</option>
              </Select>
            </div>

            {role === "mentor" && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="LinkedIn URL"
                    placeholder="https://linkedin.com/in/..."
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                  <Input
                    label="Portfolio / Website URL"
                    placeholder="https://..."
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>

                <Input
                  label="Qualifications & Verification Notes"
                  placeholder="Degrees, certifications, or supporting references"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                />

                <div className="rounded-2xl bg-interlink-surface p-4 shadow-subtle">
                  <p className="text-xs font-semibold text-interlink-ink">
                    Verification Credential (Optional)
                  </p>
                  <p className="mb-3 mt-0.5 text-[11px] text-interlink-muted">
                    Drag &amp; drop a supporting certificate, PDF document, or credential photo for
                    private administrator review.
                  </p>
                  <MediaDropzone
                    acceptKind="image_or_pdf"
                    purpose="verification"
                    cropAspect="free"
                    onUploaded={(result) => {
                      setUploadedDocKey(result.key);
                      pushToast({
                        kind: "success",
                        title: "Verification document uploaded for review",
                      });
                      router.refresh();
                    }}
                    onRemoved={() => setUploadedDocKey(null)}
                  />
                  {uploadedDocKey && (
                    <p className="mt-2 text-[11px] font-medium text-interlink-forest">
                      Submitted for review ({uploadedDocKey.split("/").pop()})
                    </p>
                  )}
                </div>

                {isOnboarding && (
                  <Input
                    label="Verification Submission Summary (Optional)"
                    placeholder="Additional context for administrators reviewing your verification"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                )}
              </>
            )}
          </div>
        </Card>

        {/* Section 5 (Mentors): Free & Paid Marketplace Pricing */}
        {role === "mentor" && (
          <Card id="profile-pricing">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Mentorship Pricing &amp; Packages
                </h2>
                <p className="mt-0.5 text-xs text-interlink-muted">
                  Offer free mentorship, paid packages, or both. Completed paid bookings split 85% to
                  you and 15% Interlink platform fee.
                </p>
              </div>
              <span className="rounded-full bg-interlink-forest/10 px-3 py-1 text-[11px] font-semibold text-interlink-forest">
                85% Mentor &middot; 15% Platform
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(
                [
                  {
                    value: "free",
                    label: "Free Mentorship Only",
                    desc: "Open access at ₦0",
                  },
                  {
                    value: "hybrid",
                    label: "Free + Paid Options",
                    desc: "Keep free seats & offer paid packages",
                  },
                  {
                    value: "paid",
                    label: "Paid Packages Only",
                    desc: "Hourly, per-session, or monthly",
                  },
                ] as const
              ).map((option) => {
                const active = pricingMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPricingMode(option.value)}
                    className={`rounded-2xl border p-3.5 text-left transition-all ${
                      active
                        ? "border-interlink-forest bg-interlink-forest/[0.08] ring-1 ring-interlink-forest"
                        : "border-interlink-border bg-interlink-app-bg/50 hover:border-interlink-forest/50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-interlink-ink">{option.label}</p>
                    <p className="mt-0.5 text-[11px] text-interlink-muted">{option.desc}</p>
                  </button>
                );
              })}
            </div>

            {pricingMode !== "free" && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="Hourly Rate (₦ NGN)"
                    type="number"
                    min={1000}
                    step={500}
                    placeholder="e.g., 10000"
                    value={hourlyRateNgn}
                    onChange={(e) => setHourlyRateNgn(e.target.value)}
                  />
                  <Input
                    label="Per-Session Rate (₦ NGN)"
                    type="number"
                    min={1000}
                    step={500}
                    placeholder="e.g., 15000"
                    value={sessionRateNgn}
                    onChange={(e) => setSessionRateNgn(e.target.value)}
                  />
                  <Input
                    label="Monthly Package (₦ NGN)"
                    type="number"
                    min={1000}
                    step={1000}
                    placeholder="e.g., 45000"
                    value={monthlyRateNgn}
                    onChange={(e) => setMonthlyRateNgn(e.target.value)}
                  />
                </div>

                {(() => {
                  const previewGross =
                    Number.parseInt(sessionRateNgn || hourlyRateNgn || monthlyRateNgn || "0", 10) ||
                    0;
                  if (previewGross < 1000) return null;
                  const split = calculateMentorshipSplit(previewGross);
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-interlink-border bg-interlink-app-bg/70 px-4 py-3 text-xs">
                      <span className="text-interlink-muted">
                        Example payout on ₦{split.grossAmountNgn.toLocaleString("en-NG")} booking:
                      </span>
                      <div className="flex flex-wrap items-center gap-4 font-semibold">
                        <span className="text-interlink-forest">
                          You receive: ₦{split.mentorPayoutNgn.toLocaleString("en-NG")} (85%)
                        </span>
                        <span className="text-interlink-muted">
                          Interlink fee: ₦{split.platformFeeNgn.toLocaleString("en-NG")} (15%)
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        )}

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          {isOnboarding && (
            <Button
              type="button"
              variant="outline"
              loading={saving}
              onClick={(e) => saveProfile(e, false)}
            >
              Save &amp; Continue Later
            </Button>
          )}
          <Button type="submit" loading={saving}>
            {isOnboarding ? "Complete Onboarding" : "Save Changes"}
          </Button>
        </div>
      </form>

      {/* Mentor Availability & Capacity Section */}
      {role === "mentor" && (
        <Card id="availability">
          <h2 className="font-display text-base font-semibold text-interlink-ink">
            Availability &amp; Capacity
          </h2>
          <p className="mt-0.5 text-xs text-interlink-muted">
            Control incoming mentorship requests and weekly session slots.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Availability Status"
              value={availabilityStatus}
              onChange={(e) =>
                setAvailabilityStatus(e.target.value as "accepting" | "paused" | "full")
              }
            >
              <option value="accepting">Accepting New Mentees</option>
              <option value="paused">Paused (Hide from new requests)</option>
              <option value="full">At Capacity</option>
            </Select>
            <Input
              label="Maximum Active Mentees"
              type="number"
              min={1}
              max={25}
              value={maximumMentees}
              onChange={(e) => setMaximumMentees(e.target.value)}
            />
          </div>

          <div className="mt-5 space-y-3">
            {slots.map((slot, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-interlink-border bg-interlink-app-bg/50 p-3.5 sm:grid-cols-5"
              >
                <Select
                  label="Day"
                  value={String(slot.dayOfWeek)}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) =>
                        i === idx ? { ...s, dayOfWeek: Number(e.target.value) } : s,
                      ),
                    )
                  }
                >
                  {dayNames.map((day, dIdx) => (
                    <option key={day} value={dIdx}>
                      {day}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Start"
                  type="time"
                  value={slot.startTime}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, startTime: e.target.value } : s)),
                    )
                  }
                />
                <Input
                  label="End"
                  type="time"
                  value={slot.endTime}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, endTime: e.target.value } : s)),
                    )
                  }
                />
                <Input
                  label="Timezone"
                  value={slot.timezone}
                  onChange={(e) =>
                    setSlots((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, timezone: e.target.value } : s)),
                    )
                  }
                />
                <Button
                  variant="outline"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-between gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setSlots((prev) => [
                  ...prev,
                  {
                    dayOfWeek: 3,
                    startTime: "18:00",
                    endTime: "19:30",
                    timezone: "Africa/Lagos",
                    isActive: true,
                  },
                ])
              }
            >
              + Add Slot
            </Button>
            <Button onClick={saveAvailabilitySlots} loading={saving}>
              Save Schedule
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
