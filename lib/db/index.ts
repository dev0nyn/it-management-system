import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const isProduction = process.env.NODE_ENV === "production";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: isProduction ? "require" : false,
});

export const db = drizzle(client);
