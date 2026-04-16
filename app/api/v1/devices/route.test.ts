import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/monitoring/service");
vi.mock("@/lib/monitoring/worker");
vi.mock("@/lib/auth/guard");

import * as service from "@/lib/monitoring/service";
import * as worker from "@/lib/monitoring/worker";
import * as guard from "@/lib/auth/guard";
import { GET, POST } from "./route";

const mockService = vi.mocked(service);
const mockWorker = vi.mocked(worker);
const mockGuard = vi.mocked(guard);

const mockAdminSession = { id: "u1", email: "admin@test.com", role: "admin" as const };
const mockDevice = {
  id: "d1",
  name: "web-01",
  host: "10.0.0.1",
  port: 80,
  type: "server" as const,
  status: "unknown" as const,
  checkIntervalSec: 60,
  consecutiveFailures: 0,
  lastCheckedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/devices", {
    method: body ? "POST" : "GET",
    headers: body
      ? { "Content-Type": "application/json", Authorization: "Bearer tok" }
      : { Authorization: "Bearer tok" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.upsertDeviceScheduler.mockResolvedValue(undefined);
});

describe("GET /api/v1/devices", () => {
  it("returns devices for it_staff", async () => {
    mockGuard.requireAnyRole.mockReturnValue({ session: mockAdminSession });
    mockService.listDevices.mockResolvedValue([mockDevice]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGuard.requireAnyRole.mockReturnValue({
      error: new (await import("next/server")).NextResponse(null, { status: 401 }),
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    // listDevices should not be called
    expect(mockService.listDevices).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/devices", () => {
  it("creates a device and schedules it", async () => {
    mockGuard.requireRole.mockReturnValue({ session: mockAdminSession });
    mockService.createDevice.mockResolvedValue(mockDevice);

    const res = await POST(
      makeReq({ name: "web-01", host: "10.0.0.1", port: 80, type: "server" })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("web-01");
    expect(mockWorker.upsertDeviceScheduler).toHaveBeenCalledWith("d1", 60);
  });

  it("returns 422 on validation error", async () => {
    mockGuard.requireRole.mockReturnValue({ session: mockAdminSession });

    const res = await POST(makeReq({ name: "", host: "x", port: 99999, type: "server" }));
    expect(res.status).toBe(422);
    expect(mockService.createDevice).not.toHaveBeenCalled();
  });

  it("still returns 201 when scheduler fails", async () => {
    mockGuard.requireRole.mockReturnValue({ session: mockAdminSession });
    mockService.createDevice.mockResolvedValue(mockDevice);
    mockWorker.upsertDeviceScheduler.mockRejectedValue(new Error("redis down"));

    const res = await POST(
      makeReq({ name: "web-01", host: "10.0.0.1", port: 80, type: "server" })
    );
    expect(res.status).toBe(201);
  });
});
