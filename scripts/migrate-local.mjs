/**
 * migrate-local.mjs — runs all pending Drizzle migrations against a LOCAL database.
 * No SSL required. Reads DATABASE_URL from .env.local or the environment.
 *
 * Usage:
 *   node scripts/migrate-local.mjs
 *   DATABASE_URL="postgres://..." node scripts/migrate-local.mjs
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "lib/db/migrations");

// Load .env.local if DATABASE_URL not already set
if (!process.env.DATABASE_URL) {
  const envPath = join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key === "DATABASE_URL") {
        process.env.DATABASE_URL = val;
        break;
      }
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set. Add it to .env.local or pass it via the environment.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: false, max: 1 });

try {
  // Ensure tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id         serial PRIMARY KEY,
      hash       text NOT NULL UNIQUE,
      created_at bigint
    )
  `;

  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")
  );

  for (const entry of journal.entries) {
    const { tag, when } = entry;
    const already = await sql`SELECT 1 FROM __drizzle_migrations WHERE hash = ${tag} LIMIT 1`;
    if (already.length > 0) {
      console.log(`  skip  ${tag} (already applied)`);
      continue;
    }

    const sqlFile = join(MIGRATIONS_DIR, `${tag}.sql`);
    const migrationSql = readFileSync(sqlFile, "utf8");

    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  apply ${tag}...`);
    for (const statement of statements) {
      if (/^\s*CREATE\s/i.test(statement)) {
        const body = statement.replace(/;\s*$/, "");
        await sql.unsafe(
          `DO $migration$ BEGIN ${body}; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $migration$;`
        );
      } else {
        await sql.unsafe(statement);
      }
    }

    await sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${tag}, ${when})`;
    console.log(`  done  ${tag}`);
  }

  console.log("✅  All migrations applied.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
