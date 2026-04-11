import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the repository and argon2 before importing the route
vi.mock("@/lib/users/repository", () => ({
  findByEmail: vi.fn(),
}));

vi.mock("argon2", () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock("@/lib/auth/jwt", () => ({
  signToken: vi.fn(() => "mocked.jwt.token"),
}));

import { POST } from "./route";
import { findByEmail } from "@/lib/users/repository";
import argon2 from "argon2";

const mockFindByEmail = vi.mocked(findByEmail);
const mockVerify = vi.mocked(argon2.verify);

const validUser = {
  id: "user-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin" as const,
  passwordHash: "hashed",
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(body: unknown, ip = "127.0.0.1") {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/login", () => {
  it("returns 200 and sets session cookie on valid credentials", async () => {
    mockFindByEmail.mockResolvedValue(validUser);
    mockVerify.mockResolvedValue(true);

    const res = await POST(makeRequest({ email: "admin@example.com", password: "admin1234" }, "10.0.0.1"));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
  });

  it("returns 401 for wrong password", async () => {
    mockFindByEmail.mockResolvedValue(validUser);
    mockVerify.mockResolvedValue(false);

    const res = await POST(makeRequest({ email: "admin@example.com", password: "wrong" }, "10.0.0.2"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 401 for unknown email", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindByEmail.mockResolvedValue(null as any);

    const res = await POST(makeRequest({ email: "nobody@example.com", password: "pass" }, "10.0.0.3"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 422 for malformed input (invalid email)", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", password: "pass" }, "10.0.0.4"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "admin@example.com" }, "10.0.0.5"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 429 after 5 attempts from same IP", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindByEmail.mockResolvedValue(null as any);
    const ip = "10.1.1.1";

    // First 5 attempts consume the allowance (all return 401)
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: "x@example.com", password: "p" }, ip));
    }

    // 6th attempt should be rate-limited
    const res = await POST(makeRequest({ email: "x@example.com", password: "p" }, ip));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
