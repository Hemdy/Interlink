import { neon } from "@neondatabase/serverless";
import { databaseUrlSchema } from "@interlink/validation";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function normalizeEnvUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || undefined;
}

export function resolveDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.STORAGE_DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeEnvUrl(candidate);
    if (normalized && databaseUrlSchema.safeParse(normalized).success) {
      return normalized;
    }
  }
  return undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

function createDatabase() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error("Database connection URL is not configured or invalid.");
  }
  const client = neon(url);

  return drizzle({ client, schema });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDb() {
  if (!database) {
    database = createDatabase();
  }

  return database;
}

export type Database = ReturnType<typeof getDb>;
