export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/assets/service";

const assignSchema = z.object({
  userId: z.string().uuid(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const body = await req.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const asset = await service.assignAsset(id, parsed.data.userId, parsed.data.force ?? false);
    return NextResponse.json({ data: asset });
  } catch (err) {
    if (err instanceof service.AssetNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Asset not found" } },
        { status: 404 }
      );
    }
    if (err instanceof service.AssetAlreadyAssignedError) {
      return NextResponse.json(
        { error: { code: "ALREADY_ASSIGNED", message: "Asset is already assigned. Use force=true to reassign." } },
        { status: 409 }
      );
    }
    throw err;
  }
}
