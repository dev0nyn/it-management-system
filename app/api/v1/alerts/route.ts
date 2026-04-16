export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/monitoring/service";

export async function GET(req: NextRequest) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const deviceId = req.nextUrl.searchParams.get("deviceId") ?? undefined;
  const rawStatus = req.nextUrl.searchParams.get("status");
  const status = rawStatus === "open" || rawStatus === "resolved" ? rawStatus : undefined;

  const alerts = await service.listAlerts({ deviceId, status });
  return NextResponse.json({ data: alerts });
}
