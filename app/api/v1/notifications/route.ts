export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";
import * as repo from "@/lib/notifications/repository";

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const items = await repo.getNotificationsForUser(session.id);
  const unreadCount = items.filter((n) => !n.read).length;

  return NextResponse.json({ data: items, unreadCount });
}
