import { ok } from "@/lib/api/http";
import { clearSessionCookieOnResponse, revokeCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await revokeCurrentSession();
  const response = ok({ loggedOut: true });
  response.headers.set("Cache-Control", "no-store");
  clearSessionCookieOnResponse(response, request);
  return response;
}
