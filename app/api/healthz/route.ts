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

  if (dbStatus === "unreachable") {
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: "ok", db: "ok", uptime: Math.floor(process.uptime()), version: "1.0.0" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
