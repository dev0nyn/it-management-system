/**
 * One-shot script: apply schema migrations then insert a test user.
 * Run from the project root with:
 *   DATABASE_URL="..." node scripts/seed-test-user.mjs
 *
 * The script is idempotent — safe to re-run.
 */

import argon2 from "argon2";
import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

// ── Test user credentials ──────────────────────────────────────────────────
const TEST_USER = {
  email: "testadmin@itms.dev",
  name: "Test Admin",
  role: "admin", // 'admin' | 'it_staff' | 'end_user'
  password: "TestPassword123!",
};
// ──────────────────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL, { ssl: "require", max: 1 });

try {
  // 1. Apply migration if the users table doesn't exist yet
  const tableCheck = await sql`
    SELECT to_regclass('public.users') AS exists
  `;
  if (!tableCheck[0].exists) {
    console.log("'users' table not found — applying migration...");
    const migrationSql = readFileSync(
      join(__dirname, "../lib/db/migrations/0000_eminent_bedlam.sql"),
      "utf8"
    );
    // Drizzle uses --> statement-breakpoint as a separator; split and run each statement
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await sql.unsafe(statement);
    }
    console.log("✅ Migration applied.");
  } else {
    console.log("'users' table already exists — skipping migration.");
  }

  // 2. Check if test user already exists
  const existing = await sql`
    SELECT id FROM users WHERE email = ${TEST_USER.email} LIMIT 1
  `;
  if (existing.length > 0) {
    console.log(`User ${TEST_USER.email} already exists (id: ${existing[0].id}). Skipping insert.`);
    process.exit(0);
  }

  // 3. Hash password and insert
  const passwordHash = await argon2.hash(TEST_USER.password);
  const [inserted] = await sql`
    INSERT INTO users (email, name, role, password_hash)
    VALUES (${TEST_USER.email}, ${TEST_USER.name}, ${TEST_USER.role}, ${passwordHash})
    RETURNING id, email, name, role, created_at
  `;

  console.log("\n✅ Test user created:");
  console.log(`   Email   : ${inserted.email}`);
  console.log(`   Name    : ${inserted.name}`);
  console.log(`   Role    : ${inserted.role}`);
  console.log(`   ID      : ${inserted.id}`);
  console.log(`   Password: ${TEST_USER.password}`);
} catch (err) {
  console.error("ERROR:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
