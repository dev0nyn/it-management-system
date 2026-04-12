/**
 * Drizzle migration runner for CI/CD.
 * Reads lib/db/migrations/_journal.json and applies any migrations
 * not yet recorded in the __drizzle_migrations tracking table.
 *
 * Usage:
 *   DATABASE_URL="..." node scripts/migrate.mjs
 */

import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../lib/db/migrations");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

try {
  // Ensure tracking table exists
  await sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id         serial PRIMARY KEY,
      hash       text NOT NULL UNIQUE,
      created_at bigint
    )
  `;

  // Read the journal
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")
  );

  for (const entry of journal.entries) {
    const { tag, when } = entry;
    const hash = tag; // use the tag as the stable identifier

    const already = await sql`
      SELECT 1 FROM __drizzle_migrations WHERE hash = ${hash} LIMIT 1
    `;
    if (already.length > 0) {
      console.log(`  skip  ${tag} (already applied)`);
      continue;
    }

    // The filename pattern is <tag>.sql e.g. 0000_eminent_bedlam.sql
    const sqlFile = join(MIGRATIONS_DIR, `${tag}.sql`);
    const migrationSql = readFileSync(sqlFile, "utf8");

    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`  apply ${tag}...`);
    for (const statement of statements) {
      // Wrap CREATE TYPE in a DO block so re-runs don't fail with
      // "type already exists" when the type was created outside Drizzle.
      if (/^\s*CREATE TYPE\s/i.test(statement)) {
        const escaped = statement.replace(/\$\$/g, "\\$\\$");
        await sql.unsafe(
          `DO $migration$ BEGIN ${escaped}; EXCEPTION WHEN duplicate_object THEN NULL; END $migration$;`
        );
      } else {
        await sql.unsafe(statement);
      }
    }

    await sql`
      INSERT INTO __drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${when})
    `;
    console.log(`  done  ${tag}`);
  }

  console.log("✅ All migrations applied.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
