import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type TokenPayload } from "./jwt";

type Role = "admin" | "it_staff" | "end_user";

export function getSession(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireRole(
  req: NextRequest,
  role: Role
): { session: TokenPayload } | { error: NextResponse } {
  const session = getSession(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      ),
    };
  }
  if (session.role !== role) {
    return {
      error: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" } },
        { status: 403 }
      ),
    };
  }
  return { session };
}
