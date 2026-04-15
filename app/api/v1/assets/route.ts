export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/assets/service";

const createSchema = z.object({
  tag: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["laptop", "monitor", "phone", "server", "printer", "network", "peripheral"]),
  serial: z.string().min(1),
  status: z.enum(["in_stock", "assigned", "repair", "retired"]).optional(),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  // End users only see assets assigned to them
  const userId = session.role === "end_user" ? session.id : undefined;

  const assets = await service.listAssets(page, search, status, userId);
  return NextResponse.json({ data: assets, page });
}

export async function POST(req: NextRequest) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  try {
    const asset = await service.createAsset(parsed.data);
    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (err) {
    if (err instanceof service.AssetTagConflictError) {
      return NextResponse.json(
        { error: { code: "TAG_CONFLICT", message: "Asset tag already in use" } },
        { status: 409 }
      );
    }
    throw err;
  }
}
