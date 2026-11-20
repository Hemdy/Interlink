import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  mentorshipGoals,
  mentorshipRequests,
  mentorships,
  reports,
  resources,
  sessions,
  userRoles,
  users,
  verificationRecords,
} from "@interlink/database";
import { WorkspacePageActions } from "@/components/layout/WorkspaceHeaderContext";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import {
  listPublishedMentorReels,
  listPublishedPlatformEvents,
} from "@/features/content/infrastructure/contentQueries";
import { listPublicCommunityPosts } from "@/features/content/infrastructure/postQueries";
import {
  PWAHomeFeedClient,
  type FeedPostItem,
} from "@/features/dashboard/ui/PWAHomeFeedClient";
import {
  getRecommendedMentorsForUser,
  listPublicMentors,
} from "@/features/discovery/infrastructure/mentorQueries";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const db = isDatabaseConfigured() ? getDb() : null;
  const isAdmin = isAdminRole(user.roles);
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  if (!db) {
    return (
      <EmptyState
        title="Database connection unavailable"
        description="Set DATABASE_URL in the root .env file to load live mentorship data."
      />
    );
  }

  if (isAdmin) {
    const [
      [totalUsers],
      [mentorsCount],
      [menteesCount],
      [activeMentorships],
      [pendingVerifs],
      [openReports],
      [completedSessions],
    ] = await Promise.all([
      db.select({ total: count() }).from(users),
      db.select({ total: count() }).from(userRoles).where(eq(userRoles.roleKey, "mentor")),
      db.select({ total: count() }).from(userRoles).where(eq(userRoles.roleKey, "mentee")),
      db.select({ total: count() }).from(mentorships).where(eq(mentorships.status, "active")),
      db
        .select({ total: count() })
        .from(verificationRecords)
        .where(eq(verificationRecords.status, "registered")),
      db.select({ total: count() }).from(reports).where(eq(reports.status, "open")),
      db.select({ total: count() }).from(sessions).where(eq(sessions.status, "completed")),
    ]);

    return (
      <>
        <WorkspacePageActions>
          <Link
            href="/admin"
            className="rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
          >
            Open Admin Console
          </Link>
        </WorkspacePageActions>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Total Users", value: Number(totalUsers?.total ?? 0) },
            {
              label: "Mentors / Mentees",
              value: `${Number(mentorsCount?.total ?? 0)} / ${Number(menteesCount?.total ?? 0)}`,
            },
            { label: "Active Circles", value: Number(activeMentorships?.total ?? 0) },
            { label: "Completed Sessions", value: Number(completedSessions?.total ?? 0) },
          ].map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs font-medium text-interlink-muted">{stat.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-interlink-ink">
                {stat.value}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card elevated>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Pending Mentor Verifications
              </h2>
              <Badge tone="gold">{Number(pendingVerifs?.total ?? 0)} pending</Badge>
            </div>
            <p className="mt-2 text-sm text-interlink-muted">
              Review mentor profiles, credentials, and supporting references.
            </p>
            <Link
              href="/admin?tab=verifications"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-interlink-forest/10 px-4 py-2 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
            >
              Review Queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card elevated>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Open Safety Reports
              </h2>
              <Badge tone={Number(openReports?.total ?? 0) > 0 ? "danger" : "neutral"}>
                {Number(openReports?.total ?? 0)} open
              </Badge>
            </div>
            <p className="mt-2 text-sm text-interlink-muted">
              Investigate user complaints and enforce community guidelines.
            </p>
            <Link
              href="/admin?tab=reports"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-interlink-forest/10 px-4 py-2 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
            >
              Investigate Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </>
    );
  }

  // Stage 1: Load social discovery feed context concurrently
  const [
    userMentorships,
    incomingOrSentReqs,
    recommendedMentors,
    publicDirectoryResult,
    publishedReels,
    publishedEvents,
    sharedResourceRows,
    communityPosts,
  ] = await Promise.all([
    db
      .select()
      .from(mentorships)
      .where(or(eq(mentorships.mentorId, user.id), eq(mentorships.menteeId, user.id)))
      .orderBy(desc(mentorships.lastActivityAt)),
    db
      .select()
      .from(mentorshipRequests)
      .where(
        isMentor
          ? eq(mentorshipRequests.mentorId, user.id)
          : eq(mentorshipRequests.menteeId, user.id),
      )
      .orderBy(desc(mentorshipRequests.createdAt)),
    !isMentor ? getRecommendedMentorsForUser(user.id, 10) : Promise.resolve([]),
    listPublicMentors({ limit: 12, viewerUserId: user.id }),
    listPublishedMentorReels(),
    listPublishedPlatformEvents(),
    db
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        category: resources.category,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(resources)
      .innerJoin(users, eq(resources.createdBy, users.id))
      .where(isNull(resources.mentorshipId))
      .orderBy(desc(resources.createdAt))
      .limit(6)
      .catch(() => []),
    listPublicCommunityPosts(user.id, 30).catch(() => []),
  ]);

  const activeRelationships = userMentorships.filter((m) => m.status === "active");
  const mentorshipIds = activeRelationships.map((m) => m.id);
  const mentorshipPartnerIdById = new Map(
    activeRelationships.map((m) => [m.id, m.mentorId === user.id ? m.menteeId : m.mentorId]),
  );

  const relatedUserIds = Array.from(
    new Set([
      ...activeRelationships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId)),
      ...incomingOrSentReqs.slice(0, 6).map((r) => (isMentor ? r.menteeId : r.mentorId)),
    ]),
  );

  // Stage 2: Load upcoming sessions, active goals, and partner avatars concurrently
  const [upcomingSessions, activeGoals, partners] = await Promise.all([
    mentorshipIds.length > 0
      ? db
          .select()
          .from(sessions)
          .where(
            and(
              inArray(sessions.mentorshipId, mentorshipIds),
              inArray(sessions.status, ["proposed", "confirmed", "rescheduled"]),
            ),
          )
          .orderBy(sessions.startTime)
          .limit(5)
      : Promise.resolve([]),
    mentorshipIds.length > 0
      ? db
          .select()
          .from(mentorshipGoals)
          .where(inArray(mentorshipGoals.mentorshipId, mentorshipIds))
          .orderBy(desc(mentorshipGoals.updatedAt))
          .limit(4)
      : Promise.resolve([]),
    relatedUserIds.length > 0
      ? db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImage: sql<string | null>`CASE WHEN ${users.profileImage} LIKE 'data:%' THEN NULL ELSE ${users.profileImage} END`,
          })
          .from(users)
          .where(inArray(users.id, relatedUserIds))
      : Promise.resolve([]),
  ]);

  const partnerMap = new Map(partners.map((p) => [p.id, p]));
  const pendingIncoming = isMentor
    ? incomingOrSentReqs.filter((r) => ["pending", "info_requested"].includes(r.status))
    : [];

  const feedSessions = upcomingSessions.map((s) => {
    const partnerId = mentorshipPartnerIdById.get(s.mentorshipId);
    const partner = partnerId ? partnerMap.get(partnerId) : undefined;
    return {
      id: s.id,
      mentorshipId: s.mentorshipId,
      title: s.title,
      startTime: s.startTime.toISOString(),
      status: s.status,
      partnerName: partner ? `${partner.firstName} ${partner.lastName}` : "Mentorship Partner",
      partnerImage: partner?.profileImage ?? null,
    };
  });

  const feedRequests = pendingIncoming.slice(0, 4).map((req) => {
    const applicant = partnerMap.get(req.menteeId);
    return {
      id: req.id,
      menteeName: applicant ? `${applicant.firstName} ${applicant.lastName}` : "Mentee",
      menteeImage: applicant?.profileImage ?? null,
      careerObjective: req.careerObjective,
      createdAt: req.createdAt.toISOString(),
    };
  });

  const feedGoals = activeGoals.map((g) => ({
    id: g.id,
    mentorshipId: g.mentorshipId,
    title: g.title,
    status: g.status,
  }));

  const feedPosts: FeedPostItem[] = sharedResourceRows.map((row) => ({
    id: row.id,
    authorName: `${row.firstName} ${row.lastName}`.trim(),
    authorRole: "Shared Learning Resource",
    topic: row.category || "Career Guide",
    title: row.title,
    body: row.description,
    href: "/learn",
    ctaLabel: "Open Resource",
  }));

  return (
    <>
      <WorkspacePageActions>
        <Link
          href={isMentor ? "/requests" : "/mentors"}
          className="whitespace-nowrap rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
        >
          {isMentor ? `Requests (${pendingIncoming.length})` : "Explore Mentors"}
        </Link>
      </WorkspacePageActions>

      <PWAHomeFeedClient
        user={user}
        role={isMentor ? "mentor" : "mentee"}
        recommendedMentors={recommendedMentors}
        directoryMentors={publicDirectoryResult.mentors}
        reels={publishedReels}
        events={publishedEvents}
        upcomingSessions={feedSessions}
        pendingRequests={feedRequests}
        activeGoals={feedGoals}
        sharedPosts={feedPosts}
        communityPosts={communityPosts}
      />
    </>
  );
}
