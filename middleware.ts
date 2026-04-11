import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/auth/jwt-edge";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/codev"];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/users",
  "/assets",
  "/tickets",
  "/reports",
  "/monitoring",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await verifyTokenEdge(token);
    return NextResponse.next();
  } catch {
    // Token is invalid or expired — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
