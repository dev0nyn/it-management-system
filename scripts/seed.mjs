/**
 * seed.mjs — Comprehensive local dev seed.
 * Creates test users (admin / it_staff / end_user) + sample assets.
 * Idempotent: safe to re-run; existing rows are skipped by email/tag.
 *
 * Usage:
 *   node scripts/seed.mjs
 *   DATABASE_URL="postgres://..." node scripts/seed.mjs
 */

import argon2 from "argon2";
import postgres from "postgres";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Load .env.local ──────────────────────────────────────────────────────────
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
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: false, max: 1 });

// ── Seed data ────────────────────────────────────────────────────────────────

const TEST_USERS = [
  { email: "admin@itms.local",  name: "Alice Admin",   role: "admin",    password: "Admin1234!" },
  { email: "staff@itms.local",  name: "Bob IT Staff",  role: "it_staff", password: "Staff1234!" },
  { email: "user@itms.local",   name: "Carol User",    role: "end_user", password: "User1234!"  },
  { email: "user2@itms.local",  name: "Dave User",     role: "end_user", password: "User1234!"  },
];

const SAMPLE_ASSETS = [
  {
    tag: "LAP-001",
    name: "MacBook Pro 14″",
    type: "laptop",
    serial: "C02XG0XXMD6T",
    status: "in_stock",
    purchase_date: "2023-06-01",
    warranty_expiry: "2026-06-01",
  },
  {
    tag: "LAP-002",
    name: "Dell XPS 15",
    type: "laptop",
    serial: "5CG1234XYZ",
    status: "in_stock",
    purchase_date: "2023-09-15",
    warranty_expiry: "2026-09-15",
  },
  {
    tag: "MON-001",
    name: "LG UltraWide 34″",
    type: "monitor",
    serial: "LG34UN880A001",
    status: "in_stock",
    purchase_date: "2022-11-20",
    warranty_expiry: "2025-11-20",
  },
  {
    tag: "MON-002",
    name: "Dell UltraSharp 27″",
    type: "monitor",
    serial: "DU27U001XYZ",
    status: "repair",
    purchase_date: "2022-03-10",
    warranty_expiry: "2025-03-10",
  },
  {
    tag: "PHN-001",
    name: "iPhone 15 Pro",
    type: "phone",
    serial: "F2LXXXXNXXXXX",
    status: "in_stock",
    purchase_date: "2024-01-05",
    warranty_expiry: "2025-01-05",
  },
  {
    tag: "SRV-001",
    name: "Dell PowerEdge R750",
    type: "server",
    serial: "PE750XYZ001",
    status: "in_stock",
    purchase_date: "2022-07-01",
    warranty_expiry: "2027-07-01",
  },
  {
    tag: "PRT-001",
    name: "HP LaserJet Pro",
    type: "printer",
    serial: "HPLJ001XYZ",
    status: "retired",
    purchase_date: "2019-04-01",
    warranty_expiry: "2022-04-01",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

try {
  console.log("\n🌱  Seeding users...");
  const insertedUsers = {};

  for (const u of TEST_USERS) {
    const existing = await sql`SELECT id FROM users WHERE email = ${u.email} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`  skip  ${u.email} (already exists)`);
      insertedUsers[u.email] = existing[0].id;
      continue;
    }
    const hash = await argon2.hash(u.password);
    const [row] = await sql`
      INSERT INTO users (email, name, role, password_hash)
      VALUES (${u.email}, ${u.name}, ${u.role}, ${hash})
      RETURNING id
    `;
    insertedUsers[u.email] = row.id;
    console.log(`  seed  ${u.email}  [${u.role}]`);
  }

  console.log("\n🌱  Seeding assets...");
  const insertedAssets = {};

  for (const a of SAMPLE_ASSETS) {
    const existing = await sql`SELECT id FROM assets WHERE tag = ${a.tag} LIMIT 1`;
    if (existing.length > 0) {
      console.log(`  skip  ${a.tag} (already exists)`);
      insertedAssets[a.tag] = existing[0].id;
      continue;
    }
    const [row] = await sql`
      INSERT INTO assets (tag, name, type, serial, status, purchase_date, warranty_expiry)
      VALUES (
        ${a.tag}, ${a.name}, ${a.type}, ${a.serial}, ${a.status},
        ${a.purchase_date ?? null}, ${a.warranty_expiry ?? null}
      )
      RETURNING id
    `;
    insertedAssets[a.tag] = row.id;
    console.log(`  seed  ${a.tag} — ${a.name}  [${a.status}]`);
  }

  // Assign LAP-001 to Carol User, create history row
  const carolId = insertedUsers["user@itms.local"];
  const lap001Id = insertedAssets["LAP-001"];
  if (carolId && lap001Id) {
    const alreadyAssigned = await sql`
      SELECT 1 FROM asset_assignments
      WHERE asset_id = ${lap001Id} AND unassigned_at IS NULL
      LIMIT 1
    `;
    if (alreadyAssigned.length === 0) {
      await sql`UPDATE assets SET status = 'assigned', assigned_to = ${carolId} WHERE id = ${lap001Id}`;
      await sql`
        INSERT INTO asset_assignments (asset_id, user_id)
        VALUES (${lap001Id}, ${carolId})
      `;
      console.log("\n  assign LAP-001 → Carol User");
    } else {
      console.log("\n  skip  LAP-001 assignment (already assigned)");
    }
  }

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║   ✅  Seed complete!                         ║");
  console.log("║                                              ║");
  console.log("║   Login credentials:                        ║");
  console.log("║     admin@itms.local   / Admin1234!          ║");
  console.log("║     staff@itms.local   / Staff1234!          ║");
  console.log("║     user@itms.local    / User1234!           ║");
  console.log("║     user2@itms.local   / User1234!           ║");
  console.log("╚══════════════════════════════════════════════╝\n");
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
