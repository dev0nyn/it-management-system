export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";
import * as repo from "@/lib/tickets/repository";
import * as service from "@/lib/tickets/service";

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

    // End users can only view events for their own tickets
    if (session.role === "end_user" && ticket.createdBy !== session.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      );
    }

    const events = await repo.findEventsByTicketId(id);
    return NextResponse.json({ data: events });
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
