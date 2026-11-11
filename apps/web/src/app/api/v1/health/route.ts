import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@interlink/database";
import { ok } from "@/lib/api/http";
import { assetExists, isObjectStorageConfigured } from "@/lib/storage/assets";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  const storageConfigured = isObjectStorageConfigured();
  let dbConnected = false;
  let storageConnected = false;

  if (dbConfigured) {
    try {
      await getDb().execute(sql`SELECT 1`);
      dbConnected = true;
    } catch {
      dbConnected = false;
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

  return ok({
    status: "ok",
    databaseConfigured: dbConfigured,
    databaseConnected: dbConnected,
    objectStorageConfigured: storageConfigured,
    objectStorageConnected: storageConnected,
    timestamp: new Date().toISOString(),
  });
}
