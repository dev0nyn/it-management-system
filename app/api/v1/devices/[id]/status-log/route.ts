export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/monitoring/service";
import { DeviceNotFoundError } from "@/lib/monitoring/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const log = await service.getStatusLog(id);
    return NextResponse.json({ data: log });
  } catch (err) {
    if (err instanceof DeviceNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Device not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}
