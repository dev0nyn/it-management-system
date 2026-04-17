export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireAnyRole } from "@/lib/auth/guard";
import * as service from "@/lib/tickets/service";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  category: z.string().min(1).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
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
    const ticket = await service.getTicket(id);

    // End users can only view their own tickets
    if (session.role === "end_user" && ticket.createdBy !== session.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: ticket });
  } catch (err) {
    if (err instanceof service.TicketNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
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
    const ticket = await service.updateTicket(id, parsed.data, auth.session.id);
    return NextResponse.json({ data: ticket });
  } catch (err) {
    if (err instanceof service.TicketNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
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
    await service.deleteTicket(id, auth.session.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof service.TicketNotFoundError) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ticket not found" } },
        { status: 404 }
      );
    }
    throw err;
  }
}
