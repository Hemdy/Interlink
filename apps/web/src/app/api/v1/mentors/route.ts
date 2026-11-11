import { ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { listPublicMentors } from "@/features/discovery/infrastructure/mentorQueries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = await getCurrentUser();

  const sortParam = searchParams.get("sort");
  const sort =
    sortParam === "experience" || sortParam === "newest" ? sortParam : "relevant";

  const minExperienceRaw = searchParams.get("minExperience");
  const minExperience = minExperienceRaw ? Number.parseInt(minExperienceRaw, 10) : undefined;

  const result = await listPublicMentors({
    q: searchParams.get("q") ?? undefined,
    industryId: searchParams.get("industryId") ?? undefined,
    expertise: searchParams.get("expertise") ?? undefined,
    language: searchParams.get("language") ?? undefined,
    sessionPreference: searchParams.get("sessionPreference") ?? undefined,
    availability: searchParams.get("availability") ?? undefined,
    minExperience: Number.isFinite(minExperience) ? minExperience : undefined,
    verifiedOnly: searchParams.get("verifiedOnly") === "true",
    sort,
    page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
    limit: Number.parseInt(searchParams.get("limit") ?? "12", 10) || 12,
    viewerUserId: user?.id ?? null,
  });

  return ok(result);
}
