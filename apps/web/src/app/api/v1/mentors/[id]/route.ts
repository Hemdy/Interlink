import { uuidSchema } from "@interlink/validation";
import { apiError, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorPublicDetail } from "@/features/discovery/infrastructure/mentorQueries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return apiError("Invalid mentor identifier.", 400);
  }

  const user = await getCurrentUser();
  const mentor = await getMentorPublicDetail(id, user?.id ?? null);
  if (!mentor) {
    return apiError("Mentor profile not found.", 404);
  }

  return ok({ mentor });
}
