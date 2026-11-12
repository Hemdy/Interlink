import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  getDb,
  industries,
  isDatabaseConfigured,
  menteeProfiles,
  mentorAvailability,
  mentorProfiles,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditorClient } from "@/features/profiles/ui/ProfileEditorClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const role = user.roles.includes("mentor") ? "mentor" : "mentee";
  const db = isDatabaseConfigured() ? getDb() : null;

  const [industryList, initialMentor, initialMentee, slots] = db
    ? await Promise.all([
        db
          .select({ id: industries.id, name: industries.name })
          .from(industries)
          .where(eq(industries.isActive, true))
          .orderBy(asc(industries.name)),
        role === "mentor"
          ? db
              .select()
              .from(mentorProfiles)
              .where(eq(mentorProfiles.userId, user.id))
              .limit(1)
              .then((r) => r[0] ?? null)
          : Promise.resolve(null),
        role === "mentee"
          ? db
              .select()
              .from(menteeProfiles)
              .where(eq(menteeProfiles.userId, user.id))
              .limit(1)
              .then((r) => r[0] ?? null)
          : Promise.resolve(null),
        role === "mentor"
          ? db
              .select()
              .from(mentorAvailability)
              .where(eq(mentorAvailability.mentorId, user.id))
          : Promise.resolve([]),
      ])
    : [[], null, null, []];

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="My Profile"
      subtitle="Manage your professional details, visibility, and availability"
      actions={
        role === "mentor" ? (
          <Link
            href={`/mentors/${user.id}`}
            className="rounded-[2px] border border-interlink-hairline bg-white px-4 py-2 text-xs font-medium text-interlink-ink hover:border-interlink-forest"
          >
            Preview Public Profile
          </Link>
        ) : undefined
      }
    >
      <ProfileEditorClient
        role={role}
        industries={industryList}
        initialMentor={initialMentor}
        initialMentee={initialMentee}
        initialSlots={slots}
        userFirstName={user.firstName}
        userLastName={user.lastName}
        initialProfileImage={user.profileImage}
      />
    </AppShell>
  );
}
