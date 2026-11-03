import { neon } from "@neondatabase/serverless";
import { databaseEnvironmentSchema } from "@interlink/validation";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDatabase() {
  const { DATABASE_URL } = databaseEnvironmentSchema.parse(process.env);
  const client = neon(DATABASE_URL);

  return drizzle({ client, schema });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDb() {
  if (!database) {
    database = createDatabase();
  }

  return database;
}
