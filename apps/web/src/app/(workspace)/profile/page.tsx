import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  menteeProfiles,
  mentorAvailability,
  mentorProfiles,
} from "@interlink/database";
import { WorkspacePageActions } from "@/components/layout/WorkspaceHeaderContext";
import { listUserPublishedContent } from "@/features/content/infrastructure/postQueries";
import { listActiveIndustries } from "@/features/discovery/infrastructure/mentorQueries";
import { ProfileHubClient } from "@/features/profiles/ui/ProfileHubClient";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const role = user.roles.includes("mentor") ? "mentor" : "mentee";
  const db = isDatabaseConfigured() ? getDb() : null;

  const [industryList, initialMentor, initialMentee, slots, publishedContent] =
    await Promise.all([
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
    ]);

  return (
    <>
      {role === "mentor" && (
        <WorkspacePageActions>
          <Link
            href={`/mentors/${user.id}`}
            className="rounded-full border border-interlink-border bg-interlink-surface px-4 py-2 text-xs font-semibold text-interlink-ink shadow-subtle transition-colors hover:border-interlink-forest hover:text-interlink-forest"
          >
            Preview Public Profile
          </Link>
        </WorkspacePageActions>
      )}

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
      />
    </>
  );
}
