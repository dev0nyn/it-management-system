import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "./use-session";
import { SessionProvider } from "./session-context";
import React from "react";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SessionProvider, null, children);

const mockUser = { id: "1", email: "admin@example.com", role: "admin" as const };

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("useSession", () => {
  it("starts in loading state", () => {
    vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useSession(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("populates user when /api/auth/me returns 200", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockUser), { status: 200 })
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
  });

  it("sets user to null when /api/auth/me returns 401", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "UNAUTHORIZED" } }), {
        status: 401,
      })
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("throws when used outside SessionProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useSession())).toThrow(
      "useSessionContext must be used within a SessionProvider"
    );
    consoleError.mockRestore();
  });
});
