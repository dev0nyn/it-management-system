export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/assets/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const asset = await service.unassignAsset(id);
    return NextResponse.json({ data: asset });
  } catch (err) {
    if (err instanceof service.AssetNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Asset not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}
