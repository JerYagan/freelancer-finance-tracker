import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/server/db/schema";

export function getTestDatabaseUrl(): string {
  if (process.env.DATABASE_TEST_URL) {
    return process.env.DATABASE_TEST_URL;
  }
  const baseUrl =
    process.env.DATABASE_URL ||
    "postgresql://user:password@localhost:5432/freelancer_finance";
  if (baseUrl.endsWith("_test")) {
    return baseUrl;
  }
  return `${baseUrl}_test`;
}

export function createTestDbClient() {
  const sql = postgres(getTestDatabaseUrl(), { max: 1 });
  const db = drizzle(sql, { schema });
  return { db, sql };
}
