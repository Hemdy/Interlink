import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  menteeProfiles,
  mentorProfiles,
} from "@interlink/database";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileEditorClient } from "@/features/profiles/ui/ProfileEditorClient";
import { listActiveIndustries } from "@/features/discovery/infrastructure/mentorQueries";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const role = user.roles.includes("mentor") ? "mentor" : "mentee";
  const db = isDatabaseConfigured() ? getDb() : null;

  const [unreadCount, industryList, initialMentor, initialMentee] = db
    ? await Promise.all([
        getUnreadNotificationCount(user.id),
        listActiveIndustries(),
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
    : [0, [], null, null];

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
