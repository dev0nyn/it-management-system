import { NextRequest, NextResponse } from "next/server";

const corsOrigin = process.env.CORS_ORIGIN ?? "*";

/**
 * Handle CORS preflight (OPTIONS) for all API routes.
 * Without this, cross-origin POST/PUT/DELETE from Vercel to Railway
 * fail because Next.js returns 405 for unhandled OPTIONS, and
 * browsers reject non-2xx preflight responses per the Fetch spec.
 */
export function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
