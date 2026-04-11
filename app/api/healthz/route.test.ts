import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

// Import after mock is set up
import { GET } from "./route";
import { db } from "@/lib/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

describe("GET /api/healthz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with healthy shape when DB is reachable", async () => {
    mockDb.execute.mockResolvedValueOnce([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.version).toBe("1.0.0");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 with error shape when DB throws", async () => {
    mockDb.execute.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("unreachable");
  });
});
