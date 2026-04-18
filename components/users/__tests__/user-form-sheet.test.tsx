import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserFormSheet, type ApiUser } from "../user-form-sheet";

// ---------------------------------------------------------------------------
// Mock @/lib/api-client so authFetch passes through to global.fetch without
// touching localStorage (which is unavailable / throws in this jsdom config).
// ---------------------------------------------------------------------------
vi.mock("@/lib/api-client", () => ({
  getToken: vi.fn().mockReturnValue(null),
  authFetch: vi.fn().mockImplementation(
    (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init)
  ),
}));

// ---------------------------------------------------------------------------
// Mock @/components/ui/sheet
// @base-ui/react/dialog relies on pointer capture and animation APIs absent
// in jsdom. Replace every Sheet primitive with inert HTML so the form content
// is always in the DOM when `open` is true.
// ---------------------------------------------------------------------------
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="sheet-root">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
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

// ---------------------------------------------------------------------------
// Mock @/components/ui/select
// base-ui Select doesn't render item labels in jsdom when the popup is closed.
// Replace with a native <select> so toHaveValue assertions work correctly.
// ---------------------------------------------------------------------------
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string | null) => void;
    children: React.ReactNode;
  }) => (
    <select
      role="combobox"
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseUser: ApiUser = {
  id: "user-42",
  name: "Alice Smith",
  email: "alice@example.com",
  role: "it_staff",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

function makeSuccessResponse(body: unknown = { id: "new-id" }): Response {
  return new Response(JSON.stringify(body), { status: 201 });
}

function makeErrorResponse(code: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: { code, message: "error" } }),
    { status }
  );
}

function renderSheet(
  props: Partial<React.ComponentProps<typeof UserFormSheet>> = {}
) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();

  const defaults: React.ComponentProps<typeof UserFormSheet> = {
    mode: "create",
    open: true,
    onOpenChange,
    onSuccess,
  };

  const result = render(<UserFormSheet {...defaults} {...props} />);
  return { ...result, onOpenChange, onSuccess };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Field rendering
// ---------------------------------------------------------------------------

describe("UserFormSheet field rendering", () => {
  it("renders Name, Email, Password, and Role fields in create mode", () => {
    renderSheet({ mode: "create" });

    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Min. 8 characters")).toBeInTheDocument();
    // Select is mocked as a native <select>; check its .value
    expect(screen.getByRole("combobox")).toHaveValue("end_user");
  });

  it("does not render the Password field in edit mode", () => {
    renderSheet({ mode: "edit", user: baseUser });

    expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Min. 8 characters")
    ).not.toBeInTheDocument();
  });

  it("shows 'Add User' title in create mode", () => {
    renderSheet({ mode: "create" });
    expect(screen.getByRole("heading", { name: "Add User" })).toBeInTheDocument();
  });

  it("shows 'Edit User' title in edit mode", () => {
    renderSheet({ mode: "edit", user: baseUser });
    expect(screen.getByRole("heading", { name: "Edit User" })).toBeInTheDocument();
  });

  it("renders nothing when open is false", () => {
    renderSheet({ open: false });
    expect(screen.queryByTestId("sheet-root")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Pre-fill in edit mode
// ---------------------------------------------------------------------------

describe("UserFormSheet pre-fill (edit mode)", () => {
  it("pre-fills name, email, and role from the user prop", () => {
    renderSheet({ mode: "edit", user: baseUser });

    expect(screen.getByPlaceholderText("Full name")).toHaveValue("Alice Smith");
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("alice@example.com");
    expect(screen.getByRole("combobox")).toHaveValue("it_staff");
  });

  it("does not pre-fill fields in create mode (fields start empty)", () => {
    renderSheet({ mode: "create" });

    expect(screen.getByPlaceholderText("Full name")).toHaveValue("");
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// Form reset when open toggles
// ---------------------------------------------------------------------------

describe("UserFormSheet form reset on re-open", () => {
  it("resets fields when open changes from false to true", async () => {
    const { rerender, onOpenChange, onSuccess } = renderSheet({
      mode: "create",
      open: true,
    });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    expect(screen.getByPlaceholderText("Full name")).toHaveValue("Bob");

    rerender(
      <UserFormSheet
        mode="create"
        open={false}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );
    rerender(
      <UserFormSheet
        mode="create"
        open={true}
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByPlaceholderText("Full name")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// Create submission
// ---------------------------------------------------------------------------

describe("UserFormSheet create submission", () => {
  it("POSTs to /api/v1/users with name, email, password, and role", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeSuccessResponse()));
    const mockFetch = vi.mocked(global.fetch);

    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob Jones");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/v1/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Bob Jones",
            email: "bob@example.com",
            password: "password123",
            role: "end_user",
          }),
        })
      );
    });

    vi.unstubAllGlobals();
  });

  it("calls onSuccess and onOpenChange(false) after successful create", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeSuccessResponse()));
    const { onSuccess, onOpenChange } = renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob Jones");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Edit submission
// ---------------------------------------------------------------------------

describe("UserFormSheet edit submission", () => {
  it("PATCHes /api/v1/users/:id with name, email, and role (no password)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: baseUser.id }), { status: 200 })
      )
    );
    const mockFetch = vi.mocked(global.fetch);

    renderSheet({ mode: "edit", user: baseUser });

    const nameInput = screen.getByDisplayValue("Alice Smith");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Alice Updated");

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/v1/users/${baseUser.id}`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Alice Updated",
            email: "alice@example.com",
            role: "it_staff",
          }),
        })
      );
    });

    vi.unstubAllGlobals();
  });

  it("calls onSuccess and onOpenChange(false) after successful edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: baseUser.id }), { status: 200 })
      )
    );
    const { onSuccess, onOpenChange } = renderSheet({
      mode: "edit",
      user: baseUser,
    });

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("UserFormSheet error responses", () => {
  it("shows 'This email is already in use.' on 409 EMAIL_CONFLICT", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeErrorResponse("EMAIL_CONFLICT", 409))
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(
        screen.getByText("This email is already in use.")
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("shows 'Please check your input and try again.' on 422 VALIDATION_ERROR with no field details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeErrorResponse("VALIDATION_ERROR", 422))
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(
        screen.getByText("Please check your input and try again.")
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("shows field-level errors on 422 VALIDATION_ERROR with details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid",
              details: { fieldErrors: { email: ["Invalid email format"] } },
            },
          }),
          { status: 422 }
        )
      )
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "not-an-email"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(
        screen.getByText("email: Invalid email format")
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("shows generic error message for unknown error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeErrorResponse("INTERNAL_ERROR", 500))
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });

  it("shows network error message when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(
        screen.getByText("Network error. Please try again.")
      ).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// Submit button disabled state
// ---------------------------------------------------------------------------

describe("UserFormSheet submit button state", () => {
  it("submit button is enabled before submission", () => {
    renderSheet({ mode: "create" });
    expect(
      screen.getByRole("button", { name: "Create User" })
    ).not.toBeDisabled();
  });

  it("submit button is disabled while submitting (shows Saving...)", async () => {
    let resolveFetch!: (v: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });

    await act(async () => { resolveFetch(makeSuccessResponse()); });
    vi.unstubAllGlobals();
  });

  it("Cancel button is disabled while submitting", async () => {
    let resolveFetch!: (v: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    renderSheet({ mode: "create" });

    await userEvent.type(screen.getByPlaceholderText("Full name"), "Bob");
    await userEvent.type(
      screen.getByPlaceholderText("user@example.com"),
      "bob@example.com"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Min. 8 characters"),
      "password123"
    );

    fireEvent.submit(
      screen.getByTestId("sheet-content").querySelector("form")!
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    await act(async () => { resolveFetch(makeSuccessResponse()); });
    vi.unstubAllGlobals();
  });
});
