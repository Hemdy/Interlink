import { eq } from "drizzle-orm";
import { eventRegistrations, getDb, isDatabaseConfigured, platformEvents } from "@interlink/database";
import { registerEventSchema, uuidSchema } from "@interlink/validation";
import { apiError, created, handleRouteError, parseBody } from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = await parseBody(request, registerEventSchema);
    if (parsed.error) return parsed.error;

    const user = await getCurrentUser();
    const { eventId, attendeeName, attendeeEmail } = parsed.data;

    if (isDatabaseConfigured() && uuidSchema.safeParse(eventId).success) {
      const db = getDb();
      const [event] = await db
        .select({ id: platformEvents.id })
        .from(platformEvents)
        .where(eq(platformEvents.id, eventId))
        .limit(1);

      if (!event) {
        return apiError("Selected event or opportunity was not found.", 404);
      }

      const [registration] = await db
        .insert(eventRegistrations)
        .values({
          eventId,
          userId: user?.id ?? null,
          attendeeName,
          attendeeEmail,
        })
        .returning({ id: eventRegistrations.id });

      return created({
        registered: true,
        registrationId: registration?.id ?? eventId,
      });
    }

    return created({
      registered: true,
      registrationId: eventId,
    });
  } catch (err) {
    return handleRouteError("events/register", err);
  }
}
