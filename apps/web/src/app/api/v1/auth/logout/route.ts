import { ok } from "@/lib/api/http";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function POST() {
  await revokeCurrentSession();
  return ok({ loggedOut: true });
}
