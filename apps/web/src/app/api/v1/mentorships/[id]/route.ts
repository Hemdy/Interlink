import { uuidSchema } from "@interlink/validation";
import { apiError, ensureDatabaseConfigured, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";
import { getMentorshipWorkspaceData } from "@/features/mentorships/infrastructure/mentorshipQueries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const dbGuard = ensureDatabaseConfigured();
  if (dbGuard) return dbGuard;

  const user = await getCurrentUser();
  if (!user) return apiError("Authentication required.", 401);

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) return apiError("Invalid mentorship ID.", 400);

  const workspace = await getMentorshipWorkspaceData(id, user.id);
  if (!workspace) return apiError("Mentorship workspace not found.", 404);

  return ok(workspace);
}
