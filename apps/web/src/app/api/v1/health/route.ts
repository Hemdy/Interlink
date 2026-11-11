import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@interlink/database";
import { ok } from "@/lib/api/http";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  let dbConnected = false;

  if (dbConfigured) {
    try {
      await getDb().execute(sql`SELECT 1`);
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
  }

  return ok({
    status: "ok",
    databaseConfigured: dbConfigured,
    databaseConnected: dbConnected,
    timestamp: new Date().toISOString(),
  });
}
