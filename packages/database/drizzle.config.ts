import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(packageDirectory, "../..");

for (const envFile of [".env.local", ".env"]) {
  const fullPath = resolve(rootDirectory, envFile);
  if (existsSync(fullPath)) {
    config({ path: fullPath });
  }
}

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL_UNPOOLED or DATABASE_URL in the repository root .env or .env.local file.",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
