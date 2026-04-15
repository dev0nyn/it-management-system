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

// Mock Redis rate limiter — unit tests don't require a real Redis instance
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn().mockResolvedValue(false),
  recordFailedAttempt: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route";
import { findByEmail } from "@/lib/users/repository";
import argon2 from "argon2";
import { isRateLimited, recordFailedAttempt } from "@/lib/rate-limit";

const mockFindByEmail = vi.mocked(findByEmail);
const mockVerify = vi.mocked(argon2.verify);
const mockIsRateLimited = vi.mocked(isRateLimited);
const mockRecordFailedAttempt = vi.mocked(recordFailedAttempt);

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
  mockIsRateLimited.mockResolvedValue(false);
  mockRecordFailedAttempt.mockResolvedValue(undefined);
});

describe("POST /api/auth/login", () => {
  it("returns 200 and sets session cookie on valid credentials", async () => {
    mockFindByEmail.mockResolvedValue(validUser);
    mockVerify.mockResolvedValue(true);

    const res = await POST(makeRequest({ email: "admin@example.com", password: "admin1234" }));
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
    expect(mockRecordFailedAttempt).not.toHaveBeenCalled();
  });

  it("returns 401 for wrong password and records failed attempt", async () => {
    mockFindByEmail.mockResolvedValue(validUser);
    mockVerify.mockResolvedValue(false);

    const res = await POST(makeRequest({ email: "admin@example.com", password: "wrong" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(mockRecordFailedAttempt).toHaveBeenCalledWith(
      expect.any(String),
      "admin@example.com"
    );
  });

  it("returns 401 for unknown email and records failed attempt", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindByEmail.mockResolvedValue(null as any);

    const res = await POST(makeRequest({ email: "nobody@example.com", password: "pass" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
    expect(mockRecordFailedAttempt).toHaveBeenCalledWith(
      expect.any(String),
      "nobody@example.com"
    );
  });

  it("returns 422 for malformed input (invalid email)", async () => {
    const res = await POST(makeRequest({ email: "not-an-email", password: "pass" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when password is missing", async () => {
    const res = await POST(makeRequest({ email: "admin@example.com" }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 429 with Retry-After header when rate limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);

    const res = await POST(makeRequest({ email: "x@example.com", password: "p" }));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("uses rightmost x-forwarded-for value as client IP", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindByEmail.mockResolvedValue(null as any);
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // leftmost is attacker-controlled, rightmost is the trusted proxy value
        "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      },
      body: JSON.stringify({ email: "x@example.com", password: "p" }),
    });
    await POST(req);
    expect(mockIsRateLimited).toHaveBeenCalledWith("10.0.0.1");
  });
});
