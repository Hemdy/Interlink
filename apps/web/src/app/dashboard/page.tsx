import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, or } from "drizzle-orm";
import { formatDate, formatDateTime } from "@interlink/utils";
import {
  getDb,
  isDatabaseConfigured,
  menteeProfiles,
  mentorProfiles,
  mentorshipGoals,
  mentorshipRequests,
  mentorships,
  notifications,
  reports,
  sessions,
  userRoles,
  users,
  verificationRecords,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { Badge, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { getRecommendedMentorsForUser } from "@/features/discovery/infrastructure/mentorQueries";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  Inbox,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const unreadCount = await getUnreadNotificationCount(user.id);
  const db = isDatabaseConfigured() ? getDb() : null;
  const isAdmin = isAdminRole(user.roles);
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  if (!db) {
    return (
      <AppShell user={user} unreadCount={unreadCount} title="Dashboard">
        <EmptyState
          title="Database connection unavailable"
          description="Set DATABASE_URL in the root .env file to load live mentorship data."
        />
      </AppShell>
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
      <AppShell
        user={user}
        unreadCount={unreadCount}
        title="Administrator Overview"
        subtitle="Platform-wide oversight, verification queue, and safety governance"
        actions={
          <Link
            href="/admin"
            className="rounded-[2px] bg-interlink-forest px-4 py-2 text-xs font-medium text-white hover:bg-interlink-forest-hover"
          >
            Open Admin Console
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Registered Users", value: Number(totalUsers?.total ?? 0) },
            {
              label: "Mentors / Mentees",
              value: `${Number(mentorsCount?.total ?? 0)} / ${Number(menteesCount?.total ?? 0)}`,
            },
            { label: "Active Mentorships", value: Number(activeMentorships?.total ?? 0) },
            { label: "Completed Sessions", value: Number(completedSessions?.total ?? 0) },
          ].map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs font-medium text-interlink-muted">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-interlink-ink">{stat.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Pending Mentor Verifications
              </h2>
              <Badge tone="gold">{Number(pendingVerifs?.total ?? 0)} pending</Badge>
            </div>
            <p className="mt-2 text-sm text-interlink-muted">
              Review mentor professional profiles, credentials, and supporting references.
            </p>
            <Link
              href="/admin?tab=verifications"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-interlink-forest hover:underline"
            >
              Review Verification Queue <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Open Safety Reports
              </h2>
              <Badge tone={Number(openReports?.total ?? 0) > 0 ? "danger" : "neutral"}>
                {Number(openReports?.total ?? 0)} open
              </Badge>
            </div>
            <p className="mt-2 text-sm text-interlink-muted">
              Investigate user complaints, record outcomes, and enforce community guidelines.
            </p>
            <Link
              href="/admin?tab=reports"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-interlink-forest hover:underline"
            >
              Investigate Reports <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  // Load shared relationship & session context
  const [userMentorships, incomingOrSentReqs, recentNotifs] = await Promise.all([
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
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(5),
  ]);

  const activeRelationships = userMentorships.filter((m) => m.status === "active");
  const mentorshipIds = activeRelationships.map((m) => m.id);

  const [upcomingSessions, activeGoals] =
    mentorshipIds.length > 0
      ? await Promise.all([
          db
            .select()
            .from(sessions)
            .where(
              and(
                inArray(sessions.mentorshipId, mentorshipIds),
                inArray(sessions.status, ["proposed", "confirmed", "rescheduled"]),
              ),
            )
            .orderBy(sessions.startTime)
            .limit(5),
          db
            .select()
            .from(mentorshipGoals)
            .where(inArray(mentorshipGoals.mentorshipId, mentorshipIds))
            .orderBy(desc(mentorshipGoals.updatedAt))
            .limit(5),
        ])
      : [[], []];

  const partnerIds = Array.from(
    new Set(
      activeRelationships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId)),
    ),
  );
  const partners =
    partnerIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, partnerIds))
      : [];
  const partnerMap = new Map(partners.map((p) => [p.id, p]));

  if (isMentor) {
    const [mentorProfile] = await db
      .select()
      .from(mentorProfiles)
      .where(eq(mentorProfiles.userId, user.id))
      .limit(1);

    const pendingIncoming = incomingOrSentReqs.filter((r) =>
      ["pending", "info_requested"].includes(r.status),
    );

    return (
      <AppShell
        user={user}
        unreadCount={unreadCount}
        title={`Welcome back, ${user.firstName}`}
        subtitle="Manage your mentorship commitments, availability, and active mentees"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/requests"
              className="rounded-[2px] bg-interlink-forest px-4 py-2 text-xs font-medium text-white hover:bg-interlink-forest-hover"
            >
              Review Requests ({pendingIncoming.length})
            </Link>
            <Link
              href="/profile#availability"
              className="hidden rounded-[2px] border border-interlink-hairline bg-white px-4 py-2 text-xs font-medium text-interlink-ink hover:border-interlink-forest sm:inline-block"
            >
              Manage Availability
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-interlink-muted">Verification Status</p>
            <div className="mt-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-interlink-forest" />
              <span className="text-base font-semibold capitalize text-interlink-ink">
                {mentorProfile?.verificationStatus ?? "registered"}
              </span>
            </div>
          </Card>

          <Card>
            <p className="text-xs text-interlink-muted">Mentee Capacity</p>
            <p className="mt-2 text-2xl font-semibold text-interlink-ink">
              {activeRelationships.length} / {mentorProfile?.maximumMentees ?? 3}
            </p>
            <p className="mt-0.5 text-xs text-interlink-forest">
              {mentorProfile?.availabilityStatus === "accepting"
                ? "Accepting requests"
                : "Requests paused"}
            </p>
          </Card>

          <Card>
            <p className="text-xs text-interlink-muted">Incoming Requests</p>
            <p className="mt-2 text-2xl font-semibold text-interlink-ink">
              {pendingIncoming.length}
            </p>
          </Card>

          <Card>
            <p className="text-xs text-interlink-muted">Upcoming Sessions</p>
            <p className="mt-2 text-2xl font-semibold text-interlink-ink">
              {upcomingSessions.length}
            </p>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Active Mentees
                </h2>
                <Link href="/mentorships" className="text-xs font-medium text-interlink-forest">
                  View all &rarr;
                </Link>
              </div>
              {activeRelationships.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={<Users className="h-5 w-5" />}
                    title="No active mentees yet"
                    description="Complete your mentor profile and review incoming mentorship requests to start mentoring."
                    action={
                      <Link
                        href="/profile"
                        className="rounded-[2px] bg-interlink-forest px-4 py-2 text-xs font-medium text-white"
                      >
                        Update Mentor Profile
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeRelationships.map((m) => {
                    const mentee = partnerMap.get(m.menteeId);
                    return (
                      <Link
                        key={m.id}
                        href={`/mentorships/${m.id}`}
                        className="flex items-center justify-between rounded-[2px] border border-slate-200 p-3.5 hover:border-interlink-forest"
                      >
                        <div>
                          <p className="text-sm font-semibold text-interlink-ink">
                            {mentee ? `${mentee.firstName} ${mentee.lastName}` : "Mentee"}
                          </p>
                          <p className="text-xs text-interlink-muted">
                            Started {formatDate(m.startDate)}
                          </p>
                        </div>
                        <Badge tone="forest">Open Workspace &rarr;</Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Incoming Mentorship Requests
                </h2>
                <Link href="/requests" className="text-xs font-medium text-interlink-forest">
                  Manage &rarr;
                </Link>
              </div>
              {pendingIncoming.length === 0 ? (
                <p className="mt-4 text-sm text-interlink-muted">
                  You have no pending mentorship requests right now.
                </p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {pendingIncoming.slice(0, 3).map((req) => (
                    <Link
                      key={req.id}
                      href="/requests"
                      className="block rounded-[2px] border border-slate-200 p-3 hover:border-interlink-forest"
                    >
                      <p className="text-sm font-medium text-interlink-ink">
                        {req.careerObjective}
                      </p>
                      <p className="mt-1 text-xs text-interlink-muted">
                        Received {formatDate(req.createdAt)} &middot; Status:{" "}
                        {req.status}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <Card>
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Upcoming Sessions
              </h2>
              {upcomingSessions.length === 0 ? (
                <p className="mt-3 text-sm text-interlink-muted">
                  No upcoming mentorship sessions scheduled.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {upcomingSessions.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-[2px] border border-slate-200 p-3 text-xs"
                    >
                      <p className="font-semibold text-interlink-ink">{s.title}</p>
                      <p className="mt-1 text-interlink-muted">
                        {formatDateTime(s.startTime)} &middot;{" "}
                        <span className="capitalize">{s.status}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Recent Notifications
              </h2>
              {recentNotifs.length === 0 ? (
                <p className="mt-3 text-sm text-interlink-muted">No recent notifications.</p>
              ) : (
                <ul className="mt-3 space-y-2.5 text-xs">
                  {recentNotifs.map((n) => (
                    <li key={n.id} className="border-b border-slate-100 pb-2 last:border-0">
                      <p className="font-medium text-interlink-ink">{n.title}</p>
                      <p className="text-interlink-muted">{n.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </AppShell>
    );
  }

  // MENTEE DASHBOARD
  const [menteeProfile, recommendedMentors] = await Promise.all([
    db
      .select()
      .from(menteeProfiles)
      .where(eq(menteeProfiles.userId, user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    getRecommendedMentorsForUser(user.id, 3),
  ]);

  const pendingSent = incomingOrSentReqs.filter((r) =>
    ["pending", "info_requested"].includes(r.status),
  );

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title={`Welcome, ${user.firstName}`}
      subtitle="Track your mentorship relationships, goals, and next career steps"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/mentors"
            className="rounded-[2px] bg-interlink-forest px-4 py-2 text-xs font-medium text-white hover:bg-interlink-forest-hover"
          >
            Find a Mentor
          </Link>
          <Link
            href="/goals"
            className="hidden rounded-[2px] border border-interlink-hairline bg-white px-4 py-2 text-xs font-medium text-interlink-ink hover:border-interlink-forest sm:inline-block"
          >
            Update My Goals
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-interlink-muted">Profile Completion</p>
          <p className="mt-2 text-2xl font-semibold text-interlink-forest">
            {menteeProfile?.profileCompletion ?? 0}%
          </p>
          <Link href="/profile" className="mt-1 inline-block text-xs text-interlink-link hover:underline">
            Edit profile
          </Link>
        </Card>

        <Card>
          <p className="text-xs text-interlink-muted">Active Mentors</p>
          <p className="mt-2 text-2xl font-semibold text-interlink-ink">
            {activeRelationships.length}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-interlink-muted">Pending Requests</p>
          <p className="mt-2 text-2xl font-semibold text-interlink-ink">{pendingSent.length}</p>
        </Card>

        <Card>
          <p className="text-xs text-interlink-muted">Upcoming Sessions</p>
          <p className="mt-2 text-2xl font-semibold text-interlink-ink">
            {upcomingSessions.length}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                My Active Mentorships
              </h2>
              <Link href="/mentorships" className="text-xs font-medium text-interlink-forest">
                All workspaces &rarr;
              </Link>
            </div>
            {activeRelationships.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon={<Compass className="h-5 w-5" />}
                  title="Start your first mentorship"
                  description="Browse verified mentors aligned with your industry and submit a structured mentorship request."
                  action={
                    <Link
                      href="/mentors"
                      className="rounded-[2px] bg-interlink-forest px-5 py-2 text-xs font-medium text-white"
                    >
                      Find a Mentor
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {activeRelationships.map((m) => {
                  const mentor = partnerMap.get(m.mentorId);
                  return (
                    <Link
                      key={m.id}
                      href={`/mentorships/${m.id}`}
                      className="flex items-center justify-between rounded-[2px] border border-slate-200 p-3.5 hover:border-interlink-forest"
                    >
                      <div>
                        <p className="text-sm font-semibold text-interlink-ink">
                          {mentor ? `${mentor.firstName} ${mentor.lastName}` : "Mentor"}
                        </p>
                        <p className="text-xs text-interlink-muted">
                          Active since {formatDate(m.startDate)}
                        </p>
                      </div>
                      <Badge tone="forest">Open Workspace &rarr;</Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Recommended Mentors
              </h2>
              <Link href="/mentors" className="text-xs font-medium text-interlink-forest">
                Browse directory &rarr;
              </Link>
            </div>
            {recommendedMentors.length === 0 ? (
              <p className="mt-3 text-sm text-interlink-muted">
                No mentor recommendations available yet. Update your career interests or check the
                directory.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recommendedMentors.map((mentor) => (
                  <Link
                    key={mentor.userId}
                    href={`/mentors/${mentor.userId}`}
                    className="flex items-center justify-between rounded-[2px] border border-slate-200 p-3.5 hover:border-interlink-forest"
                  >
                    <div>
                      <p className="text-sm font-semibold text-interlink-ink">
                        {mentor.firstName} {mentor.lastName}
                      </p>
                      <p className="text-xs text-interlink-muted">
                        {mentor.currentPosition}
                        {mentor.industryName ? ` · ${mentor.industryName}` : ""}
                      </p>
                    </div>
                    {typeof mentor.matchScore === "number" && mentor.matchScore > 0 && (
                      <Badge tone="forest">{mentor.matchScore}% match</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Active Goals
              </h2>
              <Link href="/goals" className="text-xs font-medium text-interlink-forest">
                View all &rarr;
              </Link>
            </div>
            {activeGoals.length === 0 ? (
              <div className="mt-3 flex items-start gap-2.5 text-sm text-interlink-muted">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                <span>
                  Development goals are created inside your mentorship workspace once a request is
                  accepted.
                </span>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5 text-xs">
                {activeGoals.map((goal) => (
                  <li key={goal.id} className="rounded-[2px] border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-interlink-ink">{goal.title}</span>
                      <Badge tone="neutral">{goal.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Upcoming Sessions
              </h2>
              <Link href="/sessions" className="text-xs font-medium text-interlink-forest">
                Calendar &rarr;
              </Link>
            </div>
            {upcomingSessions.length === 0 ? (
              <div className="mt-3 flex items-start gap-2.5 text-sm text-interlink-muted">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                <span>No upcoming sessions scheduled yet.</span>
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5 text-xs">
                {upcomingSessions.map((s) => (
                  <li key={s.id} className="rounded-[2px] border border-slate-200 p-3">
                    <p className="font-semibold text-interlink-ink">{s.title}</p>
                    <p className="mt-1 text-interlink-muted">
                      {formatDateTime(s.startTime)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-interlink-ink">
                Recent Activity
              </h2>
              <Link href="/notifications" className="text-xs font-medium text-interlink-forest">
                All &rarr;
              </Link>
            </div>
            {recentNotifs.length === 0 ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-interlink-muted">
                <Inbox className="h-4 w-4" />
                <span>No recent notifications.</span>
              </div>
            ) : (
              <ul className="mt-3 space-y-2.5 text-xs">
                {recentNotifs.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 border-b border-slate-100 pb-2 last:border-0">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interlink-forest" />
                    <div>
                      <p className="font-medium text-interlink-ink">{n.title}</p>
                      <p className="text-interlink-muted">{n.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
