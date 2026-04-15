import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import UsersPage from "../page";
import type { ApiUser } from "@/components/users/user-form-sheet";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/components/users/user-form-sheet", () => ({
  UserFormSheet: ({
    mode,
    open,
    user,
    onSuccess,
  }: {
    mode: string;
    open: boolean;
    user?: ApiUser;
    onOpenChange: (v: boolean) => void;
    onSuccess: () => void;
  }) => (
    <div
      data-testid="user-form-sheet"
      data-mode={mode}
      data-open={String(open)}
      data-user-id={user?.id ?? ""}
    >
      <button data-testid="simulate-success" onClick={onSuccess}>
        Simulate Success
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <button className={className}>{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<ApiUser> = {}): ApiUser {
  return {
    id: "user-1",
    name: "Alice Smith",
    email: "alice@example.com",
    role: "end_user",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeUserList(count: number): ApiUser[] {
  return Array.from({ length: count }, (_, i) =>
    makeUser({
      id: `user-${i + 1}`,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "it_staff" : "end_user",
    })
  );
}

function mockFetchWith(users: ApiUser[]): ReturnType<typeof vi.fn> {
  const mockFn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: users }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
  vi.stubGlobal("fetch", mockFn);
  return mockFn;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// NOTE: No global vi.useFakeTimers() — it breaks waitFor's internal setTimeout.
// Fake timers are applied locally in debounce tests only.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initial fetch
// ---------------------------------------------------------------------------

describe("UsersPage initial fetch", () => {
  it("fetches GET /api/v1/users?page=1 on mount", async () => {
    const mockFetch = mockFetchWith([]);
    render(<UsersPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/users?page=1")
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe("UsersPage loading state", () => {
  it("renders skeleton placeholders while data is loading", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<UsersPage />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Populated state
// ---------------------------------------------------------------------------

describe("UsersPage populated state", () => {
  it("renders user rows with name and email when data loads", async () => {
    const users = [
      makeUser({ id: "u1", name: "Alice Smith", email: "alice@example.com", role: "admin" }),
      makeUser({ id: "u2", name: "Bob Jones", email: "bob@example.com", role: "it_staff" }),
    ];
    mockFetchWith(users);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    });
  });

  it("shows 'No users found.' when API returns empty array", async () => {
    mockFetchWith([]);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Search debounce
// ---------------------------------------------------------------------------

describe("UsersPage search debounce", () => {
  it("does not re-fetch synchronously when typing in the search box", async () => {
    const mockFetch = mockFetchWith([]);
    render(<UsersPage />);

    // Wait for the initial load
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByPlaceholderText(
      "Search users by name or email..."
    );
    // Change fires synchronously — debounce timer hasn't elapsed yet
    fireEvent.change(searchInput, { target: { value: "alice" } });

    // Synchronous assertion: still only the initial fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches with ?search=X after the debounce window elapses", async () => {
    const mockFetch = mockFetchWith([]);
    render(<UsersPage />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const searchInput = screen.getByPlaceholderText(
      "Search users by name or email..."
    );
    fireEvent.change(searchInput, { target: { value: "alice" } });

    // Wait up to 1s for the 300ms debounce to fire and the fetch to complete
    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith(
          expect.stringContaining("search=alice")
        );
      },
      { timeout: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// Add User button
// ---------------------------------------------------------------------------

describe("UsersPage Add User button", () => {
  it("clicking 'Add User' opens the Sheet in create mode", async () => {
    mockFetchWith([]);
    render(<UsersPage />);

    const sheet = screen.getByTestId("user-form-sheet");
    expect(sheet.getAttribute("data-open")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

    expect(sheet.getAttribute("data-open")).toBe("true");
    expect(sheet.getAttribute("data-mode")).toBe("create");
    expect(sheet.getAttribute("data-user-id")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Edit row action
// ---------------------------------------------------------------------------

describe("UsersPage Edit row action", () => {
  it("clicking 'Edit' opens Sheet in edit mode with that user pre-selected", async () => {
    const users = [
      makeUser({ id: "u1", name: "Alice Smith", email: "alice@example.com" }),
    ];
    mockFetchWith(users);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    // Both mobile and desktop dropdowns render Edit buttons; click the first
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    fireEvent.click(editButtons[0]);

    const sheet = screen.getByTestId("user-form-sheet");
    expect(sheet.getAttribute("data-open")).toBe("true");
    expect(sheet.getAttribute("data-mode")).toBe("edit");
    expect(sheet.getAttribute("data-user-id")).toBe("u1");
  });
});

// ---------------------------------------------------------------------------
// Delete row action
// ---------------------------------------------------------------------------

describe("UsersPage Delete row action", () => {
  it("clicking 'Delete' shows the confirmation overlay with the user's name", async () => {
    const users = [
      makeUser({ id: "u1", name: "Alice Smith", email: "alice@example.com" }),
    ];
    mockFetchWith(users);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText("Delete User?")).toBeInTheDocument();
    // Name appears in both the row and the overlay
    expect(screen.getAllByText("Alice Smith").length).toBeGreaterThanOrEqual(2);
  });

  it("confirming delete calls DELETE /api/v1/users/:id and re-fetches", async () => {
    const users = [
      makeUser({ id: "u1", name: "Alice Smith", email: "alice@example.com" }),
    ];
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: users }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
    vi.stubGlobal("fetch", mockFetch);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete User?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/users/u1",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it("failed delete keeps the overlay open and shows an error message", async () => {
    const users = [
      makeUser({ id: "u1", name: "Alice Smith", email: "alice@example.com" }),
    ];
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: users }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    vi.stubGlobal("fetch", mockFetch);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete User?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to delete user. Please try again.")
      ).toBeInTheDocument();
      // Overlay remains open
      expect(screen.getByText("Delete User?")).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe("UsersPage pagination", () => {
  it("Previous button is disabled on page 1", async () => {
    mockFetchWith([]);
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    });
  });

  it("Next button is disabled when fewer than 20 results are returned", async () => {
    mockFetchWith(makeUserList(5));
    render(<UsersPage />);

    await waitFor(() => {
      // Wait for data to load, then check Next is disabled
      expect(screen.queryAllByTestId("skeleton").length).toBe(0);
    });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("Next button is enabled when exactly 20 results are returned", async () => {
    mockFetchWith(makeUserList(20));
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.queryAllByTestId("skeleton").length).toBe(0);
    });

    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("Previous button becomes enabled after navigating to page 2", async () => {
    mockFetchWith(makeUserList(20));
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    });

    mockFetchWith(makeUserList(5));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Previous" })
      ).not.toBeDisabled();
    });
  });
});
