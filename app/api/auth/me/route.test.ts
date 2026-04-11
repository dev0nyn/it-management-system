import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock verifyToken so tests don't need a real JWT_SECRET
vi.mock("@/lib/auth/jwt", () => ({
  verifyToken: vi.fn(),
}));

import { GET } from "./route";
import { verifyToken } from "@/lib/auth/jwt";

const mockVerifyToken = vi.mocked(verifyToken);

const VALID_PAYLOAD = {
  id: "user-123",
  email: "admin@example.com",
  role: "admin" as const,
};

function makeRequest(cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers["cookie"] = `session=${cookieValue}`;
  }
  return new NextRequest("http://localhost/api/auth/me", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/auth/me", () => {
  it("returns 200 with id, email, role when session cookie holds a valid token", async () => {
    mockVerifyToken.mockReturnValue(VALID_PAYLOAD);

    const res = await GET(makeRequest("valid.jwt.token"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      id: "user-123",
      email: "admin@example.com",
      role: "admin",
    });
    expect(mockVerifyToken).toHaveBeenCalledWith("valid.jwt.token");
  });

  it("returns 401 when session cookie is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid or expired", async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error("JsonWebTokenError: invalid token");
    });

    const res = await GET(makeRequest("bad.jwt.token"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
