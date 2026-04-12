import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isProduction = process.env.NODE_ENV === "production";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: isProduction ? 3 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
