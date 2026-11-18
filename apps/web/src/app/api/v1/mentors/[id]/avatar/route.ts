import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, mentorProfiles, users } from "@interlink/database";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return new NextResponse(null, { status: 404 });
  }

  const { id } = await context.params;
  if (!id || id.length > 100) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const [row] = await getDb()
      .select({
        profileImage: users.profileImage,
      })
      .from(mentorProfiles)
      .innerJoin(users, eq(mentorProfiles.userId, users.id))
      .where(
        and(
          eq(mentorProfiles.userId, id),
          eq(users.status, "active"),
          eq(mentorProfiles.onboardingCompleted, true),
        ),
      )
      .limit(1);

    const src = row?.profileImage?.trim();
    if (!src || !src.startsWith("data:image/")) {
      return new NextResponse(null, { status: 404 });
    }

    const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/.exec(src);
    const mimeType = match?.[1];
    const base64Body = match?.[2];
    if (!mimeType || !base64Body) {
      return new NextResponse(null, { status: 404 });
    }

    const bytes = new Uint8Array(Buffer.from(base64Body, "base64"));

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
