import { NextResponse } from "next/server";

// Stateless JWT — nothing to invalidate server-side.
// The client clears the token from localStorage on logout.
export async function POST() {
  return NextResponse.json({ ok: true });
}
