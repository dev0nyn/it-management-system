export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/assets/service";

const updateSchema = z.object({
  tag: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.enum(["laptop", "monitor", "phone", "server", "printer", "network", "peripheral"]).optional(),
  serial: z.string().min(1).optional(),
  status: z.enum(["in_stock", "assigned", "repair", "retired"]).optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const asset = await service.getAsset(id);

    // End users can only view assets assigned to them
    if (session.role === "end_user" && asset.assignedTo !== session.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const asset = await service.updateAsset(id, parsed.data);
    return NextResponse.json({ data: asset });
  } catch (err) {
    if (err instanceof service.AssetTagConflictError) {
      return NextResponse.json(
        { error: { code: "TAG_CONFLICT", message: "Asset tag already in use" } },
        { status: 409 }
      );
    }
    if (err instanceof service.AssetNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Asset not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    await service.deleteAsset(id);
    return new NextResponse(null, { status: 204 });
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
