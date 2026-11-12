import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  getDb,
  industries,
  isDatabaseConfigured,
  menteeProfiles,
  mentorProfiles,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditorClient } from "@/features/profiles/ui/ProfileEditorClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const unreadCount = await getUnreadNotificationCount(user.id);
  const role = user.roles.includes("mentor") ? "mentor" : "mentee";
  const db = isDatabaseConfigured() ? getDb() : null;

  const [industryList, initialMentor, initialMentee] = db
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
      ])
    : [[], null, null];

  return (
    <AppShell
      user={user}
      unreadCount={unreadCount}
      title="Complete Your Onboarding"
      subtitle="Establish your professional identity and mentorship preferences"
    >
      <ProfileEditorClient
        role={role}
        industries={industryList}
        initialMentor={initialMentor}
        initialMentee={initialMentee}
        isOnboarding
        userFirstName={user.firstName}
        userLastName={user.lastName}
        initialProfileImage={user.profileImage}
      />
    </AppShell>
  );
}
