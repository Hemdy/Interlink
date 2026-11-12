import { apiError, ok } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    const res = apiError("Not authenticated.", 401);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  const res = ok({ user });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
