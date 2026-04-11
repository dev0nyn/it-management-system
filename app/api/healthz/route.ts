import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus: "ok" | "unreachable" = "ok";

  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "unreachable";
  }

  if (dbStatus === "unreachable") {
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      db: "ok",
      uptime: Math.floor(process.uptime()),
      version: "1.0.0",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
