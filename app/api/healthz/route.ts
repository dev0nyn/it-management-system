export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  // Vercel (frontend) has no DATABASE_URL — return a simple liveness response.
  // Railway (API server) has DATABASE_URL — also verify DB connectivity.
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { status: "ok" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  let dbStatus: "ok" | "unreachable" = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "unreachable";
  }

  // Always return 200 so Railway doesn't restart the container when the DB is temporarily
  // unreachable — a container restart cannot fix an external DB issue and creates a restart loop.
  return NextResponse.json(
    { status: "ok", db: dbStatus, uptime: Math.floor(process.uptime()), version: "1.0.0" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
