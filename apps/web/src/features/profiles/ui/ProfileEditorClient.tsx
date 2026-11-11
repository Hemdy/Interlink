"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

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
}: {
  role: "mentor" | "mentee";
  industries: IndustryOption[];
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
  const [uploadingDoc, setUploadingDoc] = useState(false);
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

  async function handleVerificationDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "verification");
      const res = await fetch("/api/v1/storage/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as {
        data?: { key: string };
        error?: { message: string };
      };
      if (!res.ok) {
        setError(json.error?.message ?? "Unable to upload verification document.");
        return;
      }
      setUploadedDocKey(json.data?.key ?? null);
      pushToast({ kind: "success", title: "Verification document uploaded for review" });
      router.refresh();
    } finally {
      setUploadingDoc(false);
    }
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

  return (
    <div className="space-y-8">
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-interlink-ink">
              {role === "mentor" ? "Mentor Professional Profile" : "Mentee Career Profile"}
            </h2>
            <p className="text-xs text-interlink-muted">
              Profile completion:{" "}
              <span className="font-semibold text-interlink-forest">
                {role === "mentor"
                  ? initialMentor?.profileCompletion ?? 0
                  : initialMentee?.profileCompletion ?? 0}
                %
              </span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5">
            <ErrorAlert message={error} />
          </div>
        )}

        <form onSubmit={(e) => saveProfile(e, true)} className="space-y-5">
          {role === "mentor" ? (
            <>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Spoken Languages (comma-separated)"
                  value={languagesText}
                  onChange={(e) => setLanguagesText(e.target.value)}
                  required
                />
                <Select
                  label="Session Preference"
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
                  <option value="public">Public (Directory)</option>
                  <option value="members_only">Signed-in Members Only</option>
                  <option value="private">Private (Hidden)</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="LinkedIn URL (for verification review)"
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
                placeholder="Degrees, certifications, or supporting references for verification"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
              <div className="rounded-[2px] border border-interlink-border bg-interlink-app-bg p-4">
                <p className="text-xs font-medium text-interlink-ink">
                  Supporting Verification Credential (Optional)
                </p>
                <p className="mt-0.5 text-[11px] text-interlink-muted">
                  Upload a PDF certificate or supporting document to Neon Object Storage (private
                  access for administrators only).
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-block cursor-pointer rounded-[2px] border border-interlink-hairline bg-interlink-surface px-3.5 py-1.5 text-xs font-medium text-interlink-ink hover:border-interlink-forest">
                    {uploadingDoc ? "Uploading..." : "Upload Verification Document"}
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handleVerificationDocUpload}
                      disabled={uploadingDoc}
                      className="sr-only"
                    />
                  </label>
                  {uploadedDocKey && (
                    <span className="text-xs text-interlink-forest">
                      Uploaded: {uploadedDocKey}
                    </span>
                  )}
                </div>
              </div>
              {isOnboarding && (
                <Input
                  label="Verification Submission Summary (Optional)"
                  placeholder="Any additional context for administrators reviewing your mentor verification"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Current Occupation or Study Status"
                  placeholder="e.g., Final-year Computer Science Student / Junior Analyst"
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  label="Preferred Language"
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  required
                />
                <Input
                  label="Location"
                  placeholder="e.g., Abuja, Nigeria"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <Input
                label="Career Interests (comma-separated)"
                placeholder="Frontend Development, Product Management, Data Analytics"
                value={careerInterestsText}
                onChange={(e) => setCareerInterestsText(e.target.value)}
                required
              />

              <Textarea
                label="Career Aspirations"
                placeholder="Where do you want to be in the next 1–3 years?"
                value={careerAspirations}
                onChange={(e) => setCareerAspirations(e.target.value)}
                required
                rows={3}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Existing Skills (comma-separated)"
                  placeholder="HTML, CSS, Communication"
                  value={existingSkillsText}
                  onChange={(e) => setExistingSkillsText(e.target.value)}
                />
                <Input
                  label="Skills to Develop (comma-separated)"
                  placeholder="React, System Design, Technical Interviewing"
                  value={skillsToDevelopText}
                  onChange={(e) => setSkillsToDevelopText(e.target.value)}
                />
              </div>

              <Textarea
                label="Current Challenges"
                placeholder="What obstacles or skill gaps are you facing?"
                value={currentChallenges}
                onChange={(e) => setCurrentChallenges(e.target.value)}
                rows={2}
              />

              <Textarea
                label="Mentorship Expectations"
                placeholder="What kind of guidance and accountability works best for you?"
                value={mentorshipExpectations}
                onChange={(e) => setMentorshipExpectations(e.target.value)}
                rows={2}
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Select
                  label="Preferred Session Format"
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
                  <option value="members_only">Mentors &amp; Members Only</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </Select>
              </div>
            </>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
            {isOnboarding && (
              <Button
                type="button"
                variant="outline"
                loading={saving}
                onClick={(e) => saveProfile(e, false)}
              >
                Save Progress &amp; Continue Later
              </Button>
            )}
            <Button type="submit" loading={saving}>
              {isOnboarding ? "Complete Onboarding" : "Save Profile"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Mentor Availability & Capacity Section */}
      {role === "mentor" && (
        <Card id="availability">
          <h2 className="font-display text-lg font-semibold text-interlink-ink">
            Availability &amp; Mentee Capacity
          </h2>
          <p className="mt-1 text-xs text-interlink-muted">
            Control whether you are accepting new requests, set maximum active mentees, and publish
            weekly session windows.
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
                className="grid grid-cols-1 items-end gap-3 rounded-[2px] border border-slate-200 p-3 sm:grid-cols-5"
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

          <div className="mt-4 flex flex-wrap justify-between gap-3">
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
              + Add Availability Slot
            </Button>
            <Button onClick={saveAvailabilitySlots} loading={saving}>
              Save Availability Schedule
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
