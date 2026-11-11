import { desc, eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured, resources, users } from "@interlink/database";
import { createResourceSchema } from "@interlink/validation";
import { apiError, created, ensureDatabaseConfigured, ok, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipForParticipant } from "@/features/mentorships/infrastructure/mentorshipQueries";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return ok({ resources: [] });
  }

  const { searchParams } = new URL(request.url);
  const mentorshipId = searchParams.get("mentorshipId");
  const db = getDb();

  if (mentorshipId) {
    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);
    const mentorship = await getMentorshipForParticipant(mentorshipId, user.id);
    if (!mentorship) return apiError("Forbidden.", 403);

    const rows = await db
      .select()
      .from(resources)
      .where(eq(resources.mentorshipId, mentorshipId))
      .orderBy(desc(resources.createdAt));

    return ok({ resources: rows });
  }

  const rows = await db
    .select({
      id: resources.id,
      title: resources.title,
      description: resources.description,
      resourceType: resources.resourceType,
      externalUrl: resources.externalUrl,
      category: resources.category,
      createdAt: resources.createdAt,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
    })
    .from(resources)
    .innerJoin(users, eq(resources.createdBy, users.id))
    .where(isNull(resources.mentorshipId))
    .orderBy(desc(resources.createdAt));

  return ok({ resources: rows });
}

export async function POST(request: Request) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const parsed = await parseBody(request, createResourceSchema);
  if (parsed.error) return parsed.error;

  const data = parsed.data;
  if (data.mentorshipId) {
    const mentorship = await getMentorshipForParticipant(data.mentorshipId, user.id);
    if (!mentorship) return apiError("Forbidden.", 403);
  } else if (!user.roles.some((r) => ["admin", "super_admin", "community_manager", "mentor"].includes(r))) {
    return apiError("Only mentors and administrators can publish global learning resources.", 403);
  }

  const [resource] = await getDb()
    .insert(resources)
    .values({
      mentorshipId: data.mentorshipId ?? null,
      title: data.title,
      description: data.description,
      resourceType: data.resourceType,
      externalUrl: data.externalUrl,
      category: data.category || null,
      createdBy: user.id,
    })
    .returning();

  return created({ resource });
}
