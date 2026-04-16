export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAnyRole, requireRole } from "@/lib/auth/guard";
import * as service from "@/lib/monitoring/service";
import { upsertDeviceScheduler } from "@/lib/monitoring/worker";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  type: z.enum(["server", "switch", "router", "firewall", "ap"]),
  checkIntervalSec: z.number().int().min(10).default(60),
});

export async function GET(req: NextRequest) {
  const auth = requireAnyRole(req, ["admin", "it_staff"]);
  if ("error" in auth) return auth.error;

  const devices = await service.listDevices();
  return NextResponse.json({ data: devices });
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
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

  const device = await service.createDevice(parsed.data);

  // Register health-check scheduler (fire-and-forget; worker may not be running in test)
  try {
    await upsertDeviceScheduler(device.id, device.checkIntervalSec);
  } catch (err) {
    console.error("[monitoring] failed to schedule device:", err);
  }

  return NextResponse.json({ data: device }, { status: 201 });
}
