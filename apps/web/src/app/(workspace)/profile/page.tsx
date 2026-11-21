// import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  membershipTierInterests,
  menteeProfiles,
  mentorAvailability,
  mentorProfiles,
  userBlocks,
  users,
} from "@interlink/database";
// import { WorkspacePageActions } from "@/components/layout/WorkspaceHeaderContext";
import { listUserPublishedContent } from "@/features/content/infrastructure/postQueries";
import { listActiveIndustries } from "@/features/discovery/infrastructure/mentorQueries";
import { ProfileHubClient } from "@/features/profiles/ui/ProfileHubClient";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const role = user.roles.includes("mentor") ? "mentor" : "mentee";
  const db = isDatabaseConfigured() ? getDb() : null;

  const [
    industryList,
    initialMentor,
    initialMentee,
    slots,
    publishedContent,
    blockedUsers,
    unreadNotifications,
    membershipInterest,
  ] = await Promise.all([
    listActiveIndustries(),
    db && role === "mentor"
      ? db
          .select()
          .from(mentorProfiles)
          .where(eq(mentorProfiles.userId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db && role === "mentee"
      ? db
          .select()
          .from(menteeProfiles)
          .where(eq(menteeProfiles.userId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db && role === "mentor"
      ? db
          .select()
          .from(mentorAvailability)
          .where(eq(mentorAvailability.mentorId, user.id))
      : Promise.resolve([]),
    db
      ? listUserPublishedContent(user.id).catch(() => ({
          posts: [],
          videos: [],
          articles: [],
        }))
      : Promise.resolve({ posts: [], videos: [], articles: [] }),
    db
      ? db
          .select({
            blockedUserId: userBlocks.blockedUserId,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(userBlocks)
          .innerJoin(users, eq(userBlocks.blockedUserId, users.id))
          .where(eq(userBlocks.blockerId, user.id))
          .catch(() => [])
      : Promise.resolve([]),
    getUnreadNotificationCount(user.id).catch(() => 0),
    db
      ? db
          .select({ tier: membershipTierInterests.tier })
          .from(membershipTierInterests)
          .where(eq(membershipTierInterests.userId, user.id))
          .orderBy(desc(membershipTierInterests.createdAt))
          .limit(1)
          .then((r) => r[0]?.tier ?? "free")
          .catch(() => "free" as const)
      : Promise.resolve("free" as const),
  ]);

  return (
    <>
      {/* {role === "mentor" && (
        <WorkspacePageActions>
          <Link
            href={`/mentors/${user.id}`}
            className="rounded-full border border-interlink-border bg-interlink-surface px-4 py-2 text-xs font-semibold text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
          >
            Preview Public Profile
          </Link>
        </WorkspacePageActions>
      )} */}

      <ProfileHubClient
        user={user}
        role={role}
        industries={industryList}
        initialMentor={initialMentor}
        initialMentee={initialMentee}
        initialSlots={slots}
        initialPosts={publishedContent.posts}
        initialVideos={publishedContent.videos}
        initialArticles={publishedContent.articles}
        blockedUsers={blockedUsers}
        unreadNotifications={unreadNotifications}
        membershipTier={membershipInterest}
      />
    </>
  );
}
