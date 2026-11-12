import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@interlink/database";
import { ok } from "@/lib/api/http";
import { assetExists, isObjectStorageConfigured } from "@/lib/storage/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  const storageConfigured = isObjectStorageConfigured();
  let dbConnected = false;
  let schemaReady = false;
  let storageConnected = false;

  if (dbConfigured) {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      dbConnected = true;
      await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
      schemaReady = true;
    } catch {
      schemaReady = false;
    }
  }

  if (storageConfigured) {
    try {
      await assetExists("__healthcheck__");
      storageConnected = true;
    } catch {
      storageConnected = false;
    }
  }

  const res = ok({
    status: "ok",
    databaseConfigured: dbConfigured,
    databaseConnected: dbConnected,
    schemaReady,
    objectStorageConfigured: storageConfigured,
    objectStorageConnected: storageConnected,
    timestamp: new Date().toISOString(),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
