import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
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
import { UserAvatar } from "@/components/ui/UserAvatar";
import { listPublishedPlatformEvents } from "@/features/content/infrastructure/contentQueries";
import { SocialMomentumBanner } from "@/features/dashboard/ui/SocialMomentumBanner";
import { getRecommendedMentorsForUser } from "@/features/discovery/infrastructure/mentorQueries";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Compass,
  Inbox,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const db = isDatabaseConfigured() ? getDb() : null;
  const isAdmin = isAdminRole(user.roles);
  const isMentor = user.roles.includes("mentor") && !isAdmin;

  if (!db) {
    const unreadCount = await getUnreadNotificationCount(user.id);
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
      unreadCount,
      [totalUsers],
      [mentorsCount],
      [menteesCount],
      [activeMentorships],
      [pendingVerifs],
      [openReports],
      [completedSessions],
    ] = await Promise.all([
      getUnreadNotificationCount(user.id),
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
            className="rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
          >
            Open Admin Console
          </Link>
        }
      >
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
      </AppShell>
    );
  }

  // Stage 1: Load user relationship & role context concurrently
  const [
    unreadCount,
    userMentorships,
    incomingOrSentReqs,
    recentNotifs,
    mentorProfile,
    menteeProfile,
    recommendedMentors,
    featuredEvents,
  ] = await Promise.all([
    getUnreadNotificationCount(user.id),
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
      .limit(4),
    isMentor
      ? db
          .select()
          .from(mentorProfiles)
          .where(eq(mentorProfiles.userId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    !isMentor
      ? db
          .select()
          .from(menteeProfiles)
          .where(eq(menteeProfiles.userId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    !isMentor ? getRecommendedMentorsForUser(user.id, 6) : Promise.resolve([]),
    !isMentor ? listPublishedPlatformEvents() : Promise.resolve([]),
  ]);

  const activeRelationships = userMentorships.filter((m) => m.status === "active");
  const mentorshipIds = activeRelationships.map((m) => m.id);
  const allMentorshipIds = userMentorships.map((m) => m.id);

  const relatedUserIds = Array.from(
    new Set([
      ...activeRelationships.map((m) => (m.mentorId === user.id ? m.menteeId : m.mentorId)),
      ...incomingOrSentReqs.slice(0, 6).map((r) => (isMentor ? r.menteeId : r.mentorId)),
    ]),
  );

  // Stage 2: Load sessions, goals, completed sessions count, and partner avatars concurrently
  const [upcomingSessions, activeGoals, [completedSessionRow], partners] = await Promise.all([
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
          .limit(4)
      : Promise.resolve([]),
    mentorshipIds.length > 0
      ? db
          .select()
          .from(mentorshipGoals)
          .where(inArray(mentorshipGoals.mentorshipId, mentorshipIds))
          .orderBy(desc(mentorshipGoals.updatedAt))
          .limit(4)
      : Promise.resolve([]),
    allMentorshipIds.length > 0
      ? db
          .select({ total: count() })
          .from(sessions)
          .where(
            and(
              inArray(sessions.mentorshipId, allMentorshipIds),
              eq(sessions.status, "completed"),
            ),
          )
      : Promise.resolve([{ total: 0 }]),
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
  const completedSessionsCount = Number(completedSessionRow?.total ?? 0);

  if (isMentor) {
    const pendingIncoming = incomingOrSentReqs.filter((r) =>
      ["pending", "info_requested"].includes(r.status),
    );
    const mentorCompletion = mentorProfile?.profileCompletion ?? (mentorProfile?.biography ? 85 : 35);

    return (
      <AppShell
        user={user}
        unreadCount={unreadCount}
        title={`Welcome back, ${user.firstName}`}
        subtitle="Connect with mentees, review requests, and track your guidance impact"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/requests"
              className="rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
            >
              Requests ({pendingIncoming.length})
            </Link>
          </div>
        }
      >
        <div className="space-y-6">
          <SocialMomentumBanner
            firstName={user.firstName}
            role="mentor"
            profileCompletion={mentorCompletion}
            activeConnections={activeRelationships.length}
            completedSessions={completedSessionsCount}
            goalsCount={activeGoals.length}
            pendingRequestsCount={pendingIncoming.length}
            verificationStatus={mentorProfile?.verificationStatus}
            primaryAction={
              pendingIncoming.length > 0
                ? { label: `Review ${pendingIncoming.length} Request${pendingIncoming.length === 1 ? "" : "s"}`, href: "/requests" }
                : { label: "Preview Public Profile", href: `/mentors/${user.id}` }
            }
          />

          {/* Compact Social Stats Pills */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <Card padded={false} className="p-3.5 sm:p-5">
              <p className="text-[11px] font-medium text-interlink-muted sm:text-xs">Badge Tier</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-interlink-forest" aria-hidden="true" />
                <span className="truncate font-display text-sm font-semibold capitalize text-interlink-ink sm:text-base">
                  {mentorProfile?.verificationStatus ?? "registered"}
                </span>
              </div>
            </Card>

            <Card padded={false} className="p-3.5 sm:p-5">
              <p className="text-[11px] font-medium text-interlink-muted sm:text-xs">Active Mentees</p>
              <p className="mt-1.5 font-display text-base font-semibold text-interlink-ink sm:text-xl">
                {activeRelationships.length}{" "}
                <span className="text-xs font-normal text-interlink-muted">
                  / {mentorProfile?.maximumMentees ?? 3}
                </span>
              </p>
            </Card>

            <Card padded={false} className="p-3.5 sm:p-5">
              <p className="text-[11px] font-medium text-interlink-muted sm:text-xs">Sessions</p>
              <p className="mt-1.5 font-display text-base font-semibold text-interlink-ink sm:text-xl">
                {upcomingSessions.length}{" "}
                <span className="text-xs font-normal text-interlink-muted">upcoming</span>
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Feed: Requests & Active Circle */}
            <div className="space-y-6 lg:col-span-7">
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
                    <h2 className="font-display text-base font-semibold text-interlink-ink">
                      Mentees Waiting to Connect
                    </h2>
                  </div>
                  <Link href="/requests" className="text-xs font-semibold text-interlink-forest hover:underline">
                    View all
                  </Link>
                </div>

                {pendingIncoming.length === 0 ? (
                  <p className="mt-4 text-sm text-interlink-muted">
                    You&apos;re all caught up — no pending requests right now.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {pendingIncoming.slice(0, 4).map((req) => {
                      const applicant = partnerMap.get(req.menteeId);
                      return (
                        <Link
                          key={req.id}
                          href="/requests"
                          className="group flex items-center justify-between gap-3 rounded-2xl border border-interlink-border/80 bg-interlink-app-bg/50 p-3.5 transition-all hover:border-interlink-forest hover:bg-interlink-surface"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              src={applicant?.profileImage}
                              firstName={applicant?.firstName ?? "M"}
                              lastName={applicant?.lastName ?? ""}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-interlink-ink">
                                {applicant ? `${applicant.firstName} ${applicant.lastName}` : "Mentee"}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-interlink-muted">
                                {req.careerObjective}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-interlink-forest px-3 py-1.5 text-[11px] font-semibold text-white transition-transform group-hover:scale-[1.03]">
                            Review
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-interlink-ink">
                    Your Mentee Circle
                  </h2>
                  <Link href="/mentorships" className="text-xs font-semibold text-interlink-forest hover:underline">
                    See all
                  </Link>
                </div>

                {activeRelationships.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      icon={<Users className="h-5 w-5" />}
                      title="No active mentees yet"
                      description="Keep your profile updated and availability active so aligned mentees can connect."
                      action={
                        <Link
                          href="/profile"
                          className="rounded-full bg-interlink-forest px-5 py-2 text-xs font-semibold text-white"
                        >
                          Update Profile
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {activeRelationships.map((m) => {
                      const mentee = partnerMap.get(m.menteeId);
                      return (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-interlink-border/80 bg-interlink-app-bg/45 p-3.5 transition-colors hover:border-interlink-forest/60"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative">
                              <UserAvatar
                                src={mentee?.profileImage}
                                firstName={mentee?.firstName ?? "M"}
                                lastName={mentee?.lastName ?? ""}
                                size="md"
                              />
                              <span
                                className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-interlink-surface"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-interlink-ink">
                                {mentee ? `${mentee.firstName} ${mentee.lastName}` : "Mentee"}
                              </p>
                              <p className="text-xs text-interlink-muted">
                                Connected {formatDate(m.startDate)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/mentorships/${m.id}?tab=messages`}
                              className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1.5 text-xs font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                            >
                              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                              Chat
                            </Link>
                            <Link
                              href={`/mentorships/${m.id}`}
                              className="rounded-full bg-interlink-forest/10 px-3 py-1.5 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
                            >
                              Open
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Pulse: Sessions, Spotlight & Activity */}
            <div className="space-y-6 lg:col-span-5">
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-interlink-ink">
                    Upcoming Sessions
                  </h2>
                  <Link href="/sessions" className="text-xs font-semibold text-interlink-forest hover:underline">
                    Schedule
                  </Link>
                </div>
                {upcomingSessions.length === 0 ? (
                  <p className="mt-3 text-sm text-interlink-muted">
                    No sessions scheduled yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2.5 text-xs">
                    {upcomingSessions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-xl border border-interlink-border/80 bg-interlink-app-bg/50 p-3"
                      >
                        <p className="font-semibold text-interlink-ink">{s.title}</p>
                        <p className="mt-1 text-interlink-muted">
                          {formatDateTime(s.startTime)} &middot;{" "}
                          <span className="capitalize text-interlink-forest">{s.status}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="bg-gradient-to-br from-interlink-forest/5 to-transparent">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-interlink-forest">
                      Creator Community
                    </p>
                    <h2 className="mt-1 font-display text-base font-semibold text-interlink-ink">
                      Inspire with a 60s Reel
                    </h2>
                    <p className="mt-1 text-xs text-interlink-muted">
                      Share a quick career pivot story on the Learn feed.
                    </p>
                  </div>
                  <Link
                    href="/learn"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-interlink-forest text-white shadow-subtle transition-transform hover:scale-105"
                    aria-label="Go to Learn spotlight"
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </Link>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-interlink-ink">
                    Activity Pulse
                  </h2>
                  <Link href="/notifications" className="text-xs font-semibold text-interlink-forest hover:underline">
                    All
                  </Link>
                </div>
                {recentNotifs.length === 0 ? (
                  <p className="mt-3 text-sm text-interlink-muted">No recent activity yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2.5 text-xs">
                    {recentNotifs.map((n) => (
                      <li key={n.id} className="flex items-start gap-2 border-b border-interlink-border/60 pb-2.5 last:border-0 last:pb-0">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interlink-forest" />
                        <div className="min-w-0">
                          <p className="font-medium text-interlink-ink">{n.title}</p>
                          <p className="line-clamp-2 text-interlink-muted">{n.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // MENTEE SOCIAL DISCOVERY DASHBOARD
  const pendingSent = incomingOrSentReqs.filter((r) =>
    ["pending", "info_requested"].includes(r.status),
  );
  const menteeCompletion = menteeProfile?.profileCompletion ?? 0;

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title={`Welcome, ${user.firstName}`}
      subtitle="Discover mentors, join live events, and grow your streak"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/mentors"
            className="whitespace-nowrap rounded-full bg-interlink-forest px-4 py-2 text-xs font-semibold text-white shadow-subtle transition-colors hover:bg-interlink-forest-hover"
          >
            Discover Mentors
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <SocialMomentumBanner
          firstName={user.firstName}
          role="mentee"
          profileCompletion={menteeCompletion}
          activeConnections={activeRelationships.length}
          completedSessions={completedSessionsCount}
          goalsCount={activeGoals.length}
          pendingRequestsCount={pendingSent.length}
          primaryAction={{ label: "Discover Mentors", href: "/mentors" }}
        />

        {/* IG / TikTok-Style Quick Action Pills */}
        <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto pb-1">
          {[
            { label: "Explore Mentors", href: "/mentors", icon: Compass },
            { label: "Watch Reels & Events", href: "/learn", icon: Play },
            { label: `My Goals (${activeGoals.length})`, href: "/goals", icon: Target },
            { label: `Sessions (${upcomingSessions.length})`, href: "/sessions", icon: Calendar },
            { label: `Requests (${pendingSent.length})`, href: "/requests", icon: Inbox },
          ].map((pill) => {
            const Icon = pill.icon;
            return (
              <Link
                key={pill.label}
                href={pill.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-interlink-border bg-interlink-surface px-4 py-2 text-xs font-semibold text-interlink-ink shadow-subtle transition-all hover:border-interlink-forest hover:text-interlink-forest active:scale-[0.97]"
              >
                <Icon className="h-3.5 w-3.5 text-interlink-forest" aria-hidden="true" />
                <span>{pill.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Horizontal Creator Match Rail (Instagram/TikTok Discover Pattern) */}
        {recommendedMentors.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-interlink-forest" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-interlink-ink sm:text-lg">
                  Top Mentors Picked For You
                </h2>
              </div>
              <Link href="/mentors" className="text-xs font-semibold text-interlink-forest hover:underline">
                Explore all &rarr;
              </Link>
            </div>

            <div className="no-scrollbar flex snap-x gap-3.5 overflow-x-auto pb-2">
              {recommendedMentors.map((mentor) => (
                <Link
                  key={mentor.userId}
                  href={`/mentors/${mentor.userId}`}
                  className="group flex w-[250px] shrink-0 snap-start flex-col justify-between rounded-2xl border border-interlink-border/80 bg-interlink-surface p-4 shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:border-interlink-forest/60 hover:shadow-elevated sm:w-[270px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative">
                        <UserAvatar
                          src={mentor.profileImage}
                          firstName={mentor.firstName}
                          lastName={mentor.lastName}
                          size="md"
                          className="ring-2 ring-interlink-forest/20"
                        />
                        {mentor.availabilityStatus === "accepting" && (
                          <span
                            className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-interlink-surface"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      {typeof mentor.matchScore === "number" && mentor.matchScore > 0 && (
                        <Badge tone="forest">{mentor.matchScore}% Match</Badge>
                      )}
                    </div>

                    <h3 className="mt-3 truncate font-display text-sm font-semibold text-interlink-ink group-hover:text-interlink-forest">
                      {mentor.firstName} {mentor.lastName}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-interlink-muted">
                      {mentor.currentPosition}
                      {mentor.organisation ? ` · ${mentor.organisation}` : ""}
                    </p>

                    {mentor.expertiseTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {mentor.expertiseTags.slice(0, 2).map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-interlink-border/60 pt-3 text-xs font-semibold text-interlink-forest">
                    <span>Connect</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Main 2-Column Focus Stream */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Your Mentor Circle
                </h2>
                <Link href="/mentorships" className="text-xs font-semibold text-interlink-forest hover:underline">
                  All connections
                </Link>
              </div>
              {activeRelationships.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon={<Compass className="h-5 w-5" />}
                    title="Ready for your first mentor?"
                    description="Tap any mentor above or explore the feed to send a quick intro."
                    action={
                      <Link
                        href="/mentors"
                        className="rounded-full bg-interlink-forest px-5 py-2 text-xs font-semibold text-white"
                      >
                        Browse Mentors
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {activeRelationships.map((m) => {
                    const mentor = partnerMap.get(m.mentorId);
                    return (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-interlink-border/80 bg-interlink-app-bg/50 p-3.5 transition-colors hover:border-interlink-forest/60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative">
                            <UserAvatar
                              src={mentor?.profileImage}
                              firstName={mentor?.firstName ?? "M"}
                              lastName={mentor?.lastName ?? ""}
                              size="md"
                            />
                            <span
                              className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-interlink-surface"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-interlink-ink">
                              {mentor ? `${mentor.firstName} ${mentor.lastName}` : "Mentor"}
                            </p>
                            <p className="text-xs text-interlink-muted">
                              Connected {formatDate(m.startDate)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/mentorships/${m.id}?tab=messages`}
                            className="inline-flex items-center gap-1 rounded-full border border-interlink-border bg-interlink-surface px-3 py-1.5 text-xs font-medium text-interlink-ink transition-colors hover:border-interlink-forest hover:text-interlink-forest"
                          >
                            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                            Message
                          </Link>
                          <Link
                            href={`/mentorships/${m.id}`}
                            className="rounded-full bg-interlink-forest/10 px-3 py-1.5 text-xs font-semibold text-interlink-forest transition-colors hover:bg-interlink-forest hover:text-white"
                          >
                            Workspace
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Live Community Events Drops */}
            {featuredEvents.length > 0 && (
              <Card>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-interlink-ink">
                    Live Community Events
                  </h2>
                  <Link href="/learn" className="text-xs font-semibold text-interlink-forest hover:underline">
                    See all events
                  </Link>
                </div>
                <div className="mt-4 space-y-2.5">
                  {featuredEvents.slice(0, 3).map((ev) => (
                    <Link
                      key={ev.id}
                      href="/learn"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-interlink-border/80 bg-interlink-app-bg/45 p-3.5 transition-all hover:border-interlink-forest/60 hover:bg-interlink-surface"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone="forest" className="capitalize">
                            {ev.category}
                          </Badge>
                          <span className="truncate text-[11px] text-interlink-muted">
                            {ev.locationOrFormat}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-semibold text-interlink-ink">
                          {ev.title}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-interlink-forest/10 px-3 py-1 text-[11px] font-semibold text-interlink-forest">
                        Join
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Pulse Column */}
          <div className="space-y-6 lg:col-span-5">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Goal Tracker
                </h2>
                <Link href="/goals" className="text-xs font-semibold text-interlink-forest hover:underline">
                  View all
                </Link>
              </div>
              {activeGoals.length === 0 ? (
                <div className="mt-3 flex items-start gap-2.5 text-sm text-interlink-muted">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-interlink-forest" />
                  <span>Goals unlock inside your workspace once you connect with a mentor.</span>
                </div>
              ) : (
                <ul className="mt-4 space-y-2.5 text-xs">
                  {activeGoals.map((goal) => (
                    <li
                      key={goal.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-interlink-border/80 bg-interlink-app-bg/50 p-3"
                    >
                      <span className="truncate font-semibold text-interlink-ink">{goal.title}</span>
                      <Badge tone="forest">{goal.status.replace(/_/g, " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Next Sessions
                </h2>
                <Link href="/sessions" className="text-xs font-semibold text-interlink-forest hover:underline">
                  Calendar
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
                    <li
                      key={s.id}
                      className="rounded-xl border border-interlink-border/80 bg-interlink-app-bg/50 p-3"
                    >
                      <p className="font-semibold text-interlink-ink">{s.title}</p>
                      <p className="mt-1 text-interlink-muted">{formatDateTime(s.startTime)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-interlink-ink">
                  Activity Pulse
                </h2>
                <Link href="/notifications" className="text-xs font-semibold text-interlink-forest hover:underline">
                  All
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
                    <li
                      key={n.id}
                      className="flex items-start gap-2 border-b border-interlink-border/60 pb-2.5 last:border-0 last:pb-0"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-interlink-forest" />
                      <div className="min-w-0">
                        <p className="font-medium text-interlink-ink">{n.title}</p>
                        <p className="line-clamp-2 text-interlink-muted">{n.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
