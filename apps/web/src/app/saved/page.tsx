import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorProfiles,
  savedMentors,
  users,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function SavedMentorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const db = isDatabaseConfigured() ? getDb() : null;

  const saved = db
    ? await db
        .select({
          mentorId: savedMentors.mentorId,
          firstName: users.firstName,
          lastName: users.lastName,
          currentPosition: mentorProfiles.currentPosition,
          organisation: mentorProfiles.organisation,
          verificationStatus: mentorProfiles.verificationStatus,
          availabilityStatus: mentorProfiles.availabilityStatus,
        })
        .from(savedMentors)
        .innerJoin(users, eq(savedMentors.mentorId, users.id))
        .leftJoin(mentorProfiles, eq(savedMentors.mentorId, mentorProfiles.userId))
        .where(eq(savedMentors.menteeId, user.id))
    : [];

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Saved Mentors"
      subtitle="Shortlisted mentors you want to review or request mentorship from"
    >
      {saved.length === 0 ? (
        <EmptyState
          title="No saved mentors yet"
          description="Bookmark mentors while browsing the directory to compare profiles and request mentorship later."
          action={
            <Link
              href="/mentors"
              className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
            >
              Browse Mentors
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {saved.map((m) => (
            <Card key={m.mentorId} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-interlink-ink">
                    {m.firstName} {m.lastName}
                  </h2>
                  <Badge tone={m.verificationStatus === "verified" ? "forest" : "neutral"}>
                    {m.verificationStatus ?? "registered"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-interlink-muted">
                  {m.currentPosition ?? "Mentor"}
                  {m.organisation ? ` · ${m.organisation}` : ""}
                </p>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-3">
                <Link
                  href={`/mentors/${m.mentorId}`}
                  className="text-xs font-semibold text-interlink-forest hover:underline"
                >
                  View Profile &rarr;
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
