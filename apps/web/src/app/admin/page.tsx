import { redirect } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import {
  auditLogs,
  getDb,
  industries,
  isDatabaseConfigured,
  mentorProfiles,
  reports,
  userRoles,
  users,
  verificationRecords,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/Feedback";
import { AdminConsoleClient } from "@/features/admin/ui/AdminConsoleClient";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminRole(user.roles)) redirect("/dashboard");

  const unreadCount = await getUnreadNotificationCount(user.id);
  if (!isDatabaseConfigured()) {
    return (
      <AppShell user={user} unreadCount={unreadCount} title="Admin Console">
        <EmptyState
          title="Database not configured"
          description="Set DATABASE_URL to administer users, mentor verifications, and reports."
        />
      </AppShell>
    );
  }

  const db = getDb();
  const [userRows, roleRows, verifRows, reportRows, industryRows, logRows] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select().from(userRoles),
    db
      .select({
        id: verificationRecords.id,
        mentorId: verificationRecords.mentorId,
        documentReference: verificationRecords.documentReference,
        supportingSummary: verificationRecords.supportingSummary,
        status: verificationRecords.status,
        submittedAt: verificationRecords.submittedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        currentPosition: mentorProfiles.currentPosition,
        organisation: mentorProfiles.organisation,
      })
      .from(verificationRecords)
      .innerJoin(users, eq(verificationRecords.mentorId, users.id))
      .leftJoin(mentorProfiles, eq(verificationRecords.mentorId, mentorProfiles.userId))
      .orderBy(desc(verificationRecords.submittedAt)),
    db.select().from(reports).orderBy(desc(reports.createdAt)),
    db.select().from(industries).orderBy(asc(industries.name)),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        createdAt: auditLogs.createdAt,
        actorFirstName: users.firstName,
        actorLastName: users.lastName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(100),
  ]);

  const rolesMap = new Map<string, string[]>();
  for (const r of roleRows) {
    const arr = rolesMap.get(r.userId) ?? [];
    arr.push(r.roleKey);
    rolesMap.set(r.userId, arr);
  }

  const reportUserIds = Array.from(
    new Set(reportRows.flatMap((r) => [r.reporterId, r.reportedUserId])),
  );
  const reportUsers =
    reportUserIds.length > 0
      ? await db
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(inArray(users.id, reportUserIds))
      : [];
  const reportUserMap = new Map(reportUsers.map((u) => [u.id, u]));

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Administration Console"
      subtitle="Mentor verification, trust & safety reports, user governance, and audit logs"
    >
      <AdminConsoleClient
        usersList={userRows.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          status: u.status,
          roles: rolesMap.get(u.id) ?? [],
          createdAt: u.createdAt.toISOString(),
        }))}
        verifications={verifRows.map((v) => ({
          ...v,
          submittedAt: v.submittedAt.toISOString(),
        }))}
        reportsList={reportRows.map((r) => ({
          id: r.id,
          reason: r.reason,
          description: r.description,
          status: r.status,
          resolution: r.resolution,
          reporter: reportUserMap.get(r.reporterId) ?? null,
          reportedUser: reportUserMap.get(r.reportedUserId) ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
        industriesList={industryRows}
        auditLogsList={logRows.map((l) => ({
          ...l,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </AppShell>
  );
}
