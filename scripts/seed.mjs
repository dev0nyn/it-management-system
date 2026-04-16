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

  // ── Seed sample tickets ────────────────────────────────────────────────────
  console.log("\n🌱  Seeding sample tickets...");
  const carolId2 = insertedUsers["user@itms.local"];
  const daveId   = insertedUsers["user2@itms.local"];
  const staffId  = insertedUsers["staff@itms.local"];

  if (carolId2 && daveId && staffId) {
    const existing = await sql`SELECT COUNT(*) as c FROM tickets WHERE created_by IN (${carolId2}, ${daveId})`;
    if (Number(existing[0].c) > 0) {
      console.log(`  skip  tickets (already exist)`);
    } else {
      // Helper: offset days from a base date
      const d = (base, offsetDays, offsetHours = 0) => {
        const dt = new Date(base);
        dt.setDate(dt.getDate() + offsetDays);
        dt.setHours(dt.getHours() + offsetHours);
        return dt.toISOString();
      };

      // Base date is 6 months ago from today
      const SIX_MONTHS_AGO = new Date();
      SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

      // Resolution hours by category (for closed/resolved tickets)
      const resolutionHours = {
        Hardware: 18, Software: 8, Network: 12, Access: 4, Security: 24, Infrastructure: 36,
      };

      const TICKETS = [
        // ── Month 1 (days 0–29) ──────────────────────────────────────────────
        { title: "Laptop keyboard not working", category: "Hardware",       priority: "high",   status: "closed",      createdBy: carolId2, assigneeId: staffId, dayOffset: 2  },
        { title: "Cannot access VPN",           category: "Network",        priority: "urgent", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 3  },
        { title: "Excel crashing on startup",   category: "Software",       priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 5  },
        { title: "Password reset request",      category: "Access",         priority: "low",    status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 7  },
        { title: "Monitor flickering",          category: "Hardware",       priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 10 },
        { title: "Suspicious login attempt",    category: "Security",       priority: "urgent", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 12 },
        { title: "Printer offline",             category: "Hardware",       priority: "low",    status: "resolved",    createdBy: carolId2, assigneeId: null,    dayOffset: 14 },
        { title: "Network drive inaccessible",  category: "Network",        priority: "high",   status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 17 },
        { title: "Outlook sync issue",          category: "Software",       priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 20 },
        { title: "New user account setup",      category: "Access",         priority: "low",    status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 22 },
        // ── Month 2 (days 30–59) ─────────────────────────────────────────────
        { title: "Server disk space critical",  category: "Infrastructure", priority: "urgent", status: "closed",      createdBy: carolId2, assigneeId: staffId, dayOffset: 32 },
        { title: "WiFi dropping frequently",    category: "Network",        priority: "high",   status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 35 },
        { title: "Teams audio not working",     category: "Software",       priority: "medium", status: "closed",      createdBy: carolId2, assigneeId: null,    dayOffset: 37 },
        { title: "Phishing email reported",     category: "Security",       priority: "urgent", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 40 },
        { title: "Workstation won't boot",      category: "Hardware",       priority: "high",   status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 42 },
        { title: "USB port broken",             category: "Hardware",       priority: "low",    status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 44 },
        { title: "Shared folder permissions",   category: "Access",         priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 47 },
        { title: "VPN slow connection",         category: "Network",        priority: "medium", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 50 },
        { title: "Antivirus alert triggered",   category: "Security",       priority: "high",   status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 52 },
        { title: "Cloud backup failing",        category: "Infrastructure", priority: "high",   status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 55 },
        // ── Month 3 (days 60–89) ─────────────────────────────────────────────
        { title: "Laptop battery dying fast",   category: "Hardware",       priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: null,    dayOffset: 61 },
        { title: "Cannot print to floor printer", category: "Hardware",     priority: "low",    status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 63 },
        { title: "Email attachment too large",  category: "Software",       priority: "low",    status: "closed",      createdBy: carolId2, assigneeId: null,    dayOffset: 65 },
        { title: "Network switch failure",      category: "Network",        priority: "urgent", status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 68 },
        { title: "Admin rights request",        category: "Access",         priority: "medium", status: "closed",      createdBy: carolId2, assigneeId: staffId, dayOffset: 70 },
        { title: "Ransomware detection",        category: "Security",       priority: "urgent", status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 72 },
        { title: "Software license expired",    category: "Software",       priority: "high",   status: "closed",      createdBy: carolId2, assigneeId: staffId, dayOffset: 75 },
        { title: "Database server overload",    category: "Infrastructure", priority: "urgent", status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 78 },
        { title: "Headset not recognized",      category: "Hardware",       priority: "low",    status: "closed",      createdBy: carolId2, assigneeId: null,    dayOffset: 80 },
        { title: "Zoom video not working",      category: "Software",       priority: "medium", status: "resolved",    createdBy: daveId,   assigneeId: null,    dayOffset: 83 },
        // ── Month 4 (days 90–119) ────────────────────────────────────────────
        { title: "New laptop provisioning",     category: "Hardware",       priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 92 },
        { title: "Firewall rule misconfigured", category: "Network",        priority: "high",   status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 95 },
        { title: "MFA enrollment issue",        category: "Access",         priority: "high",   status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 97 },
        { title: "Critical patch deployment",   category: "Infrastructure", priority: "urgent", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 100 },
        { title: "Adobe license needed",        category: "Software",       priority: "low",    status: "resolved",    createdBy: carolId2, assigneeId: null,    dayOffset: 103 },
        { title: "Webcam not detected",         category: "Hardware",       priority: "low",    status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 106 },
        { title: "Data breach investigation",   category: "Security",       priority: "urgent", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 108 },
        { title: "VLAN configuration change",   category: "Network",        priority: "medium", status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 111 },
        { title: "User offboarding request",    category: "Access",         priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: staffId, dayOffset: 113 },
        { title: "Storage array alert",         category: "Infrastructure", priority: "high",   status: "closed",      createdBy: daveId,   assigneeId: staffId, dayOffset: 116 },
        // ── Month 5 (days 120–149) ───────────────────────────────────────────
        { title: "RAM upgrade request",         category: "Hardware",       priority: "low",    status: "in_progress", createdBy: carolId2, assigneeId: staffId, dayOffset: 122 },
        { title: "Slack workspace sync error",  category: "Software",       priority: "medium", status: "resolved",    createdBy: daveId,   assigneeId: null,    dayOffset: 124 },
        { title: "DNS resolution failure",      category: "Network",        priority: "high",   status: "in_progress", createdBy: carolId2, assigneeId: staffId, dayOffset: 127 },
        { title: "Service account expired",     category: "Access",         priority: "high",   status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 129 },
        { title: "SSL certificate expiring",    category: "Security",       priority: "urgent", status: "in_progress", createdBy: carolId2, assigneeId: staffId, dayOffset: 132 },
        { title: "App server restart needed",   category: "Infrastructure", priority: "medium", status: "resolved",    createdBy: daveId,   assigneeId: staffId, dayOffset: 135 },
        { title: "Keyboard shortcut issue",     category: "Software",       priority: "low",    status: "closed",      createdBy: carolId2, assigneeId: null,    dayOffset: 137 },
        { title: "NIC card failure",            category: "Hardware",       priority: "high",   status: "in_progress", createdBy: daveId,   assigneeId: staffId, dayOffset: 140 },
        { title: "Proxy settings broken",       category: "Network",        priority: "medium", status: "resolved",    createdBy: carolId2, assigneeId: null,    dayOffset: 142 },
        { title: "Permission denied on share",  category: "Access",         priority: "medium", status: "closed",      createdBy: daveId,   assigneeId: null,    dayOffset: 145 },
        // ── Month 6 / Recent (days 150–175) ─────────────────────────────────
        { title: "Screen resolution reset",     category: "Hardware",       priority: "low",    status: "open",        createdBy: carolId2, assigneeId: null,    dayOffset: 151 },
        { title: "Python env not found",        category: "Software",       priority: "medium", status: "open",        createdBy: daveId,   assigneeId: null,    dayOffset: 153 },
        { title: "Network latency spike",       category: "Network",        priority: "high",   status: "in_progress", createdBy: carolId2, assigneeId: staffId, dayOffset: 156 },
        { title: "Contractor access request",   category: "Access",         priority: "medium", status: "open",        createdBy: daveId,   assigneeId: null,    dayOffset: 158 },
        { title: "Suspicious process detected", category: "Security",       priority: "urgent", status: "in_progress", createdBy: carolId2, assigneeId: staffId, dayOffset: 160 },
        { title: "Backup job timed out",        category: "Infrastructure", priority: "high",   status: "open",        createdBy: daveId,   assigneeId: null,    dayOffset: 162 },
        { title: "Mouse scroll not working",    category: "Hardware",       priority: "low",    status: "open",        createdBy: carolId2, assigneeId: null,    dayOffset: 164 },
        { title: "App crashes on save",         category: "Software",       priority: "high",   status: "in_progress", createdBy: daveId,   assigneeId: staffId, dayOffset: 166 },
        { title: "Switch port down",            category: "Network",        priority: "urgent", status: "open",        createdBy: carolId2, assigneeId: staffId, dayOffset: 168 },
        { title: "Shared mailbox access lost",  category: "Access",         priority: "medium", status: "open",        createdBy: daveId,   assigneeId: null,    dayOffset: 170 },
      ];

      for (const t of TICKETS) {
        const createdAt = d(SIX_MONTHS_AGO, t.dayOffset);
        const isResolved = t.status === "resolved" || t.status === "closed";
        const resHours = resolutionHours[t.category] ?? 12;
        const updatedAt = isResolved ? d(SIX_MONTHS_AGO, t.dayOffset, resHours) : createdAt;

        await sql`
          INSERT INTO tickets (title, description, priority, category, status, created_by, assignee_id, created_at, updated_at)
          VALUES (
            ${t.title},
            ${"Reported by user: " + t.title.toLowerCase() + ". Awaiting IT resolution."},
            ${t.priority},
            ${t.category},
            ${t.status},
            ${t.createdBy},
            ${t.assigneeId ?? null},
            ${createdAt},
            ${updatedAt}
          )
        `;
      }
      console.log(`  seed  ${TICKETS.length} sample tickets`);
    }
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
