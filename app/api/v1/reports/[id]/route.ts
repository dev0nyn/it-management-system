export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import { getReport, REPORT_IDS, type ReportId } from "@/lib/reports/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  if (!(REPORT_IDS as readonly string[]).includes(id)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: `Unknown report: ${id}` } },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const range = {
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  };

  const result = await getReport(id as ReportId, range);
  return NextResponse.json({ data: result });
}
