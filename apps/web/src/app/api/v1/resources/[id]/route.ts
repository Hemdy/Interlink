import { and, eq } from "drizzle-orm";
import { getDb, resources } from "@interlink/database";
import { updateResourceSchema, uuidSchema } from "@interlink/validation";
import {
  apiError,
  ensureDatabaseConfigured,
  handleRouteError,
  ok,
  parseBody,
} from "@/lib/api/http";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return apiError("Invalid resource ID.", 400);
    }

    const parsed = await parseBody(request, updateResourceSchema);
    if (parsed.error) return parsed.error;

    const db = getDb();
    const [existing] = await db
      .select({ id: resources.id, createdBy: resources.createdBy })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!existing) return apiError("Article or resource not found.", 404);
    if (existing.createdBy !== user.id) {
      return apiError("You can only edit articles you authored.", 403);
    }

    const data = parsed.data;
    const [updated] = await db
      .update(resources)
      .set({
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description.trim() } : {}),
        ...(data.resourceType !== undefined ? { resourceType: data.resourceType } : {}),
        ...(data.externalUrl !== undefined ? { externalUrl: data.externalUrl.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
      })
      .where(and(eq(resources.id, id), eq(resources.createdBy, user.id)))
      .returning();

    return ok({ resource: updated });
  } catch (err) {
    return handleRouteError("resources/[id]/PATCH", err);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const dbGuard = ensureDatabaseConfigured();
    if (dbGuard) return dbGuard;

    const user = await getCurrentUser();
    if (!user) return apiError("Authentication required.", 401);

    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) {
      return apiError("Invalid resource ID.", 400);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: resources.id, createdBy: resources.createdBy })
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!existing) return apiError("Article or resource not found.", 404);
    if (existing.createdBy !== user.id) {
      return apiError("You can only delete articles you authored.", 403);
    }

    await db
      .delete(resources)
      .where(and(eq(resources.id, id), eq(resources.createdBy, user.id)));

    return ok({ deleted: true });
  } catch (err) {
    return handleRouteError("resources/[id]/DELETE", err);
  }
}
