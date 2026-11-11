import type { PublicMentorSummary } from "@interlink/types";

interface MenteePreferences {
  industryInterestId: string | null;
  careerInterests: string[];
  skillsToDevelop: string[];
  careerAspirations: string;
  preferredLanguage: string;
  sessionPreference: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

export function scoreMentorCompatibility(
  mentor: PublicMentorSummary,
  mentee: MenteePreferences | null,
): { score: number; reasons: string[] } {
  if (!mentee) {
    return { score: 0, reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];

  // 1. Industry alignment (25%)
  if (mentee.industryInterestId && mentor.industryId === mentee.industryInterestId) {
    score += 25;
    if (mentor.industryName) {
      reasons.push(`Matches your target industry (${mentor.industryName})`);
    }
  }

  // 2. Expertise alignment (30%)
  const menteeInterestsLower = mentee.careerInterests.map((item) => item.toLowerCase());
  const overlappingExpertise = mentor.expertiseTags.filter((area) =>
    menteeInterestsLower.some(
      (interest) =>
        area.toLowerCase().includes(interest) || interest.includes(area.toLowerCase()),
    ),
  );
  if (overlappingExpertise.length > 0) {
    const ratio = Math.min(1, overlappingExpertise.length / Math.max(1, menteeInterestsLower.length));
    score += Math.round(15 + ratio * 15);
    reasons.push(`Expertise in ${overlappingExpertise.slice(0, 2).join(", ")}`);
  }

  // 3. Career goal alignment (20%)
  const goalTokens = new Set(tokenize(mentee.careerAspirations));
  const mentorTokens = tokenize(`${mentor.biography} ${mentor.currentPosition}`);
  const goalOverlap = mentorTokens.filter((token) => goalTokens.has(token));
  if (goalOverlap.length > 0) {
    score += Math.min(20, goalOverlap.length * 5);
    reasons.push("Background aligns with your career aspirations");
  }

  // 4. Skills development alignment (10%)
  const skillsWanted = mentee.skillsToDevelop.map((s) => s.toLowerCase());
  const mentorAreasLower = mentor.expertiseTags.map((a) => a.toLowerCase());
  const skillMatches = skillsWanted.filter((skill) =>
    mentorAreasLower.some((area) => area.includes(skill) || skill.includes(area)),
  );
  if (skillMatches.length > 0) {
    score += 10;
    reasons.push(`Supports ${skillMatches[0]} development`);
  }

  // 5. Language and session preference (10%)
  const speaksLanguage = mentor.languages.some(
    (lang) => lang.toLowerCase() === mentee.preferredLanguage.toLowerCase(),
  );
  if (speaksLanguage) score += 5;
  if (
    mentor.sessionPreference === mentee.sessionPreference ||
    mentor.sessionPreference === "hybrid"
  ) {
    score += 5;
  }

  // 6. Availability and capacity (5%)
  if (
    mentor.availabilityStatus === "accepting" &&
    mentor.activeMenteeCount < mentor.maximumMentees
  ) {
    score += 5;
    reasons.push("Currently accepting new mentees");
  }

  return { score: Math.min(100, score), reasons };
}
