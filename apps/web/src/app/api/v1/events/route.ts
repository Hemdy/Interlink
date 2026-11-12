import { getDb, platformEvents } from "@interlink/database";
import { EVENT_CATEGORIES, type EventCategory } from "@interlink/types";
import { createPlatformEventSchema } from "@interlink/validation";
import { listPublishedPlatformEvents } from "@/features/content/infrastructure/contentQueries";
import {
  apiError,
  created,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get("category");
    const category = EVENT_CATEGORIES.includes(rawCategory as EventCategory)
      ? (rawCategory as EventCategory)
      : undefined;

    const events = await listPublishedPlatformEvents(category);
    return ok({ events });
  } catch (err) {
    return handleRouteError("events/GET", err);
  }
}

export async function POST(request: Request) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);
    if (!isAdminRole(user.roles)) {
      return apiError("Administrator access required.", 403);
    }

    const parsed = await parseBody(request, createPlatformEventSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [inserted] = await db
      .insert(platformEvents)
      .values({
        title: parsed.data.title,
        category: parsed.data.category,
        summary: parsed.data.summary,
        imageUrl: parsed.data.imageUrl,
        eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
        locationOrFormat: parsed.data.locationOrFormat,
        ctaLabel: parsed.data.ctaLabel,
        ctaUrl: parsed.data.ctaUrl || null,
        isFeatured: parsed.data.isFeatured,
        isPublished: true,
      })
      .returning();

    if (!inserted) {
      return apiError("Unable to create event.", 500);
    }

    return created({
      event: {
        ...inserted,
        eventDate: inserted.eventDate ? inserted.eventDate.toISOString() : null,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError("events/POST", err);
  }
}
