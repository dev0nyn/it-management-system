import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock getSession so tests don't need a real JWT_ACCESS_SECRET
vi.mock("@/lib/auth/guard", () => ({
  getSession: vi.fn(),
}));

import { GET } from "./route";
import { getSession } from "@/lib/auth/guard";

const mockGetSession = vi.mocked(getSession);

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
  it("returns 200 with id, email, role when session is valid", async () => {
    mockGetSession.mockReturnValue(VALID_PAYLOAD);

    const res = await GET(makeRequest("valid.jwt.token"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      id: "user-123",
      email: "admin@example.com",
      role: "admin",
    });
  });

  it("returns 200 for it_staff role", async () => {
    mockGetSession.mockReturnValue({ id: "user-2", email: "staff@example.com", role: "it_staff" });

    const res = await GET(makeRequest("valid.jwt.token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("it_staff");
  });

  it("returns 200 for end_user role", async () => {
    mockGetSession.mockReturnValue({ id: "user-3", email: "user@example.com", role: "end_user" });

    const res = await GET(makeRequest("valid.jwt.token"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("end_user");
  });

  it("returns 401 with message when session cookie is missing", async () => {
    mockGetSession.mockReturnValue(null);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Authentication required");
  });

  it("returns 401 with message when token is invalid or expired", async () => {
    mockGetSession.mockReturnValue(null);

    const res = await GET(makeRequest("bad.jwt.token"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Authentication required");
  });
});
