export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/monitoring/service";
import { DeviceNotFoundError } from "@/lib/monitoring/service";
import {
  upsertDeviceScheduler,
  removeDeviceScheduler,
} from "@/lib/monitoring/worker";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  type: z.enum(["server", "switch", "router", "firewall", "ap"]).optional(),
  checkIntervalSec: z.number().int().min(10).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const device = await service.getDevice(id);
    return NextResponse.json({ data: device });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: parsed.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  try {
    const device = await service.updateDevice(id, parsed.data);

    if (parsed.data.checkIntervalSec !== undefined) {
      try {
        await upsertDeviceScheduler(device.id, device.checkIntervalSec);
      } catch (err) {
        console.error("[monitoring] failed to update scheduler:", err);
      }
    }

    return NextResponse.json({ data: device });
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    await service.deleteDevice(id);

    try {
      await removeDeviceScheduler(id);
    } catch (err) {
      console.error("[monitoring] failed to remove scheduler:", err);
    }

    return new NextResponse(null, { status: 204 });
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
