import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // Glob picks up every new schema file automatically — no manual update needed
  schema: "./lib/db/schema/*.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
