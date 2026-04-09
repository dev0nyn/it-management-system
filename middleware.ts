import { NextRequest, NextResponse } from "next/server";

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths and static assets
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Check for auth token (mock_token will be replaced with JWT in Story 1.1)
  const token = request.cookies.get("mock_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
