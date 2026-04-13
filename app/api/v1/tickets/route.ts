export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/guard";
import * as service from "@/lib/tickets/service";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category: z.string().min(1),
  assetId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

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

  const ticket = await service.createTicket(parsed.data, session.id);
  return NextResponse.json({ data: ticket }, { status: 201 });
}
