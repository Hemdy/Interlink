import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, Globe, MapPin, ShieldCheck } from "lucide-react";
import { formatDate } from "@interlink/utils";
import { PublicShell } from "@/components/layout/PublicShell";
import { Badge, Card } from "@/components/ui/Card";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getMentorPublicDetail } from "@/features/discovery/infrastructure/mentorQueries";
import { MentorProfileActions } from "@/features/discovery/ui/MentorProfileActions";
import { getCurrentUser } from "@/lib/auth/session";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const mentor = await getMentorPublicDetail(id, user?.id ?? null);

  if (!mentor) {
    notFound();
  }

  const canRequest =
    mentor.availabilityStatus === "accepting" &&
    mentor.activeMenteeCount < mentor.maximumMentees &&
    user?.id !== mentor.userId;

  return (
    <PublicShell user={user}>
      <section className="bg-interlink-app-bg py-10">
        <div className="mx-auto max-w-[1160px] px-6 sm:px-10">
          <Link
            href="/mentors"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-interlink-muted hover:text-interlink-forest"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Mentor Directory
          </Link>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Main Profile Content */}
            <div className="space-y-6 lg:col-span-8">
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      src={mentor.profileImage}
                      firstName={mentor.firstName}
                      lastName={mentor.lastName}
                      size="xl"
                    />
                    <div>
                      <h1 className="font-display text-2xl font-semibold text-interlink-ink sm:text-3xl">
                        {mentor.firstName} {mentor.lastName}
                      </h1>
                      <p className="mt-1 text-sm text-interlink-muted">
                        {mentor.currentPosition}
                        {mentor.organisation ? ` at ${mentor.organisation}` : ""}
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
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {mentor.verificationStatus === "verified"
                      ? "Verified Mentor"
                      : mentor.verificationStatus === "reviewed"
                        ? "Profile Reviewed"
                        : "Registered Mentor"}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-interlink-muted">
                  {mentor.industryName && <span>Industry: {mentor.industryName}</span>}
                  <span>Experience: {mentor.yearsOfExperience} years</span>
                  {mentor.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {mentor.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 capitalize">
                    <Globe className="h-3.5 w-3.5" /> {mentor.sessionPreference.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h2 className="text-sm font-semibold text-interlink-ink">Biography</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                    {mentor.biography}
                  </p>
                </div>

                {mentor.mentorshipApproach && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h2 className="text-sm font-semibold text-interlink-ink">
                      Mentorship Approach
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {mentor.mentorshipApproach}
                    </p>
                  </div>
                )}

                {mentor.qualifications && (
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h2 className="text-sm font-semibold text-interlink-ink">Qualifications</h2>
                    <p className="mt-2 text-sm text-slate-700">{mentor.qualifications}</p>
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-interlink-ink">
                  Areas of Expertise &amp; Skills
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mentor.expertiseAreas.map((area) => (
                    <Badge key={area} tone="forest">
                      {area}
                    </Badge>
                  ))}
                  {mentor.skills.map((skill) => (
                    <Badge key={skill} tone="neutral">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Spoken Languages
                  </h3>
                  <p className="mt-1.5 text-sm text-interlink-ink">
                    {mentor.languages.join(", ")}
                  </p>
                </div>
              </Card>
            </div>

            {/* Sidebar Actions & Availability */}
            <div className="space-y-6 lg:col-span-4">
              <Card>
                <div className="mb-4 border-b border-slate-100 pb-4">
                  <p className="text-xs font-medium text-interlink-muted">Mentorship Capacity</p>
                  <p className="mt-1 text-lg font-semibold text-interlink-ink">
                    {mentor.activeMenteeCount} / {mentor.maximumMentees} active mentees
                  </p>
                  <p className="mt-1 text-xs text-interlink-forest">
                    {mentor.availabilityStatus === "accepting"
                      ? "Accepting new mentorship requests"
                      : "Not accepting new requests right now"}
                  </p>
                </div>

                <MentorProfileActions
                  mentorId={mentor.userId}
                  mentorName={`${mentor.firstName} ${mentor.lastName}`}
                  initialSaved={mentor.isSaved}
                  canRequest={canRequest}
                  user={user}
                />

                {(mentor.linkedinUrl || mentor.portfolioUrl) && (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs">
                    {mentor.linkedinUrl && (
                      <a
                        href={mentor.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-interlink-link hover:underline"
                      >
                        LinkedIn Profile <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {mentor.portfolioUrl && (
                      <a
                        href={mentor.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-interlink-link hover:underline"
                      >
                        Portfolio / Website <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center gap-2 text-sm font-semibold text-interlink-ink">
                  <Calendar className="h-4 w-4 text-interlink-forest" />
                  <span>Typical Availability</span>
                </div>
                {mentor.availabilitySlots.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-xs text-slate-700">
                    {mentor.availabilitySlots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-center justify-between rounded-[2px] bg-interlink-app-bg px-3 py-2 text-interlink-ink"
                      >
                        <span className="font-medium">{dayNames[slot.dayOfWeek]}</span>
                        <span>
                          {slot.startTime} – {slot.endTime} ({slot.timezone})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-interlink-muted">
                    Flexible scheduling coordinated inside the mentorship workspace.
                  </p>
                )}
                <p className="mt-4 text-[11px] text-interlink-muted">
                  Profile last updated {formatDate(mentor.updatedAt)}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
