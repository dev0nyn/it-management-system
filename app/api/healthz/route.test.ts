import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore DATABASE_URL to its original value after each test
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("returns 200 with simple liveness shape when DATABASE_URL is not set (Vercel/frontend)", async () => {
    delete process.env.DATABASE_URL;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBeUndefined();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 with healthy shape when DATABASE_URL is set and DB is reachable", async () => {
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
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

  it("returns 200 with db unreachable when DATABASE_URL is set and DB throws", async () => {
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    mockDb.execute.mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("unreachable");
  });
});
