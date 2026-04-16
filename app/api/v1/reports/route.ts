export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { REPORT_DEFINITIONS } from "@/lib/reports/service";

export async function GET(req: NextRequest) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ data: REPORT_DEFINITIONS });
}
