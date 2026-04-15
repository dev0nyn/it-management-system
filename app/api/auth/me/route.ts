import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/guard";

// NOTE: This route runs in the Node.js runtime (not Edge) because getSession
// uses jsonwebtoken, which is not Edge-compatible. Use verifyTokenEdge (jose)
// if this route is ever moved to the Edge runtime.
export async function GET(req: NextRequest) {
  const session = getSession(req);

  if (!session) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: session.id,
    email: session.email,
    role: session.role,
  });
}
