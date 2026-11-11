import { apiError, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("Not authenticated.", 401);
  }
  return ok({ user });
}
