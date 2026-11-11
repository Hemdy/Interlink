import { NextResponse } from "next/server";
import type { z } from "zod";
import { isDatabaseConfigured } from "@interlink/database";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: { message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

export function ensureDatabaseConfigured() {
  if (!isDatabaseConfigured()) {
    return apiError(
      "Database is not configured. Set DATABASE_URL in the root .env file and run migrations.",
      503,
    );
  }
  return null;
}

export async function parseBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<
  { data: z.infer<TSchema>; error?: never } | { data?: never; error: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: apiError("Invalid JSON request body.", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: apiError(
        parsed.error.issues[0]?.message ?? "Validation failed.",
        400,
        parsed.error.flatten(),
      ),
    };
  }

  return { data: parsed.data as z.infer<TSchema> };
}

export function getClientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
