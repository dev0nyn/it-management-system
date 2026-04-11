import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock jwt-edge so tests don't need a real JWT or SubtleCrypto
vi.mock("@/lib/auth/jwt-edge", () => ({
  verifyTokenEdge: vi.fn(),
}));

import { middleware } from "./middleware";
import { verifyTokenEdge } from "@/lib/auth/jwt-edge";

const mockVerify = vi.mocked(verifyTokenEdge);

const VALID_PAYLOAD = { id: "u1", email: "admin@example.com", role: "admin" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("middleware auth guard", () => {
  it("redirects unauthenticated requests to /login", async () => {
    const req = new NextRequest("http://localhost/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("preserves the original path in the `from` query param", async () => {
    const req = new NextRequest("http://localhost/dashboard");
    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("from=%2Fdashboard");
  });

  it("passes through when session cookie holds a valid JWT", async () => {
    mockVerify.mockResolvedValue(VALID_PAYLOAD);
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "session=valid.jwt.token" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(mockVerify).toHaveBeenCalledWith("valid.jwt.token");
  });

  it("redirects to /login when JWT is expired", async () => {
    mockVerify.mockRejectedValue(new Error("JWTExpired"));
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "session=expired.jwt.token" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when JWT is signed with wrong secret (tampered)", async () => {
    mockVerify.mockRejectedValue(new Error("JWSSignatureVerificationFailed"));
    const req = new NextRequest("http://localhost/dashboard", {
      headers: { cookie: "session=tampered.jwt.token" },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("does not redirect /login (public path)", async () => {
    const req = new NextRequest("http://localhost/login");
    const res = await middleware(req);
    expect(res.status).toBe(200);
    // verifyTokenEdge should not be called for public paths
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("does not redirect unprotected paths", async () => {
    const req = new NextRequest("http://localhost/some-other-page");
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it.each(["/dashboard", "/users", "/assets", "/tickets", "/reports", "/monitoring"])(
    "protects %s without a token",
    async (path) => {
      const req = new NextRequest(`http://localhost${path}`);
      const res = await middleware(req);
      expect(res.status).toBe(307);
    }
  );
});
