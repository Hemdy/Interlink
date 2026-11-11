import { asc, eq } from "drizzle-orm";
import { getDb, industries, isDatabaseConfigured, skills } from "@interlink/database";
import { ok } from "@/lib/api/http";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return ok({ industries: [], skills: [] });
  }

  const db = getDb();
  const [industryList, skillList] = await Promise.all([
    db
      .select()
      .from(industries)
      .where(eq(industries.isActive, true))
      .orderBy(asc(industries.name)),
    db.select().from(skills).orderBy(asc(skills.name)),
  ]);

  return ok({ industries: industryList, skills: skillList });
}
