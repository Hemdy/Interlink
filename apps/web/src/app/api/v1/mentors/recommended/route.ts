import { apiError, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getRecommendedMentorsForUser } from "@/features/discovery/infrastructure/mentorQueries";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const mentors = await getRecommendedMentorsForUser(user.id, 6);
  return ok({ mentors });
}
