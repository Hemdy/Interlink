export function calculateMentorCompletion(input: {
  biography?: string | null;
  currentPosition?: string | null;
  organisation?: string | null;
  industryId?: string | null;
  yearsOfExperience?: number | null;
  expertiseAreas?: string[] | null;
  languages?: string[] | null;
  mentorshipApproach?: string | null;
  qualifications?: string | null;
}): number {
  const checks = [
    Boolean(input.biography && input.biography.trim().length >= 20),
    Boolean(input.currentPosition && input.currentPosition.trim().length >= 2),
    Boolean(input.organisation && input.organisation.trim().length >= 2),
    Boolean(input.industryId),
    typeof input.yearsOfExperience === "number" && input.yearsOfExperience >= 0,
    Boolean(input.expertiseAreas && input.expertiseAreas.length > 0),
    Boolean(input.languages && input.languages.length > 0),
    Boolean(input.mentorshipApproach && input.mentorshipApproach.trim().length >= 10),
    Boolean(input.qualifications && input.qualifications.trim().length >= 2),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export function calculateMenteeCompletion(input: {
  education?: string | null;
  currentOccupation?: string | null;
  industryInterestId?: string | null;
  careerInterests?: string[] | null;
  careerAspirations?: string | null;
  skillsToDevelop?: string[] | null;
  currentChallenges?: string | null;
  mentorshipExpectations?: string | null;
}): number {
  const checks = [
    Boolean(input.education && input.education.trim().length >= 2),
    Boolean(input.currentOccupation && input.currentOccupation.trim().length >= 2),
    Boolean(input.industryInterestId),
    Boolean(input.careerInterests && input.careerInterests.length > 0),
    Boolean(input.careerAspirations && input.careerAspirations.trim().length >= 15),
    Boolean(input.skillsToDevelop && input.skillsToDevelop.length > 0),
    Boolean(input.currentChallenges && input.currentChallenges.trim().length >= 5),
    Boolean(input.mentorshipExpectations && input.mentorshipExpectations.trim().length >= 5),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}
