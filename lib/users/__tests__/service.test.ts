import { describe, it, expect, vi, beforeEach } from "vitest";
import * as service from "../service";
import * as repo from "../repository";
import type { User } from "@/lib/db/schema/users";

type UserRow = Awaited<ReturnType<typeof repo.findById>>;
type FullUserRow = Awaited<ReturnType<typeof repo.findByEmail>>;
type DeleteRow = Awaited<ReturnType<typeof repo.softDelete>>;

vi.mock("../repository");
vi.mock("argon2", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
    verify: vi.fn().mockResolvedValue(true),
  },
}));

const mockUser = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  role: "end_user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("listUsers", () => {
  it("returns paginated users", async () => {
    vi.mocked(repo.findAll).mockResolvedValue([mockUser]);
    const result = await service.listUsers(1);
    expect(result).toEqual([mockUser]);
    expect(repo.findAll).toHaveBeenCalledWith(1, undefined);
  });
});

describe("getUser", () => {
  it("returns user when found", async () => {
    vi.mocked(repo.findById).mockResolvedValue(mockUser);
    const result = await service.getUser("user-1");
    expect(result).toEqual(mockUser);
  });

  it("throws UserNotFoundError when user missing", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null as unknown as UserRow);
    await expect(service.getUser("missing")).rejects.toThrow(service.UserNotFoundError);
  });
});

describe("createUser", () => {
  it("creates user and hashes password", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null as unknown as FullUserRow);
    vi.mocked(repo.create).mockResolvedValue(mockUser);

    const result = await service.createUser({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
      role: "end_user",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "hashed_password" })
    );
    expect(result).toEqual(mockUser);
  });

  it("throws EmailConflictError on duplicate email", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue({ ...mockUser, passwordHash: "x", deletedAt: null } satisfies User);
    await expect(
      service.createUser({ name: "Bob", email: "alice@example.com", password: "pass1234", role: "end_user" })
    ).rejects.toThrow(service.EmailConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe("updateUser", () => {
  it("updates user successfully", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null as unknown as FullUserRow);
    vi.mocked(repo.update).mockResolvedValue({ ...mockUser, name: "Alice Updated" });

    const result = await service.updateUser("user-1", { name: "Alice Updated" });
    expect(result.name).toBe("Alice Updated");
  });

  it("throws UserNotFoundError when update returns null", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null as unknown as FullUserRow);
    vi.mocked(repo.update).mockResolvedValue(null as unknown as UserRow);
    await expect(service.updateUser("missing", { name: "X" })).rejects.toThrow(service.UserNotFoundError);
  });

  it("throws EmailConflictError when email belongs to another user", async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue({ ...mockUser, id: "other-user", passwordHash: "x", deletedAt: null } satisfies User);
    await expect(
      service.updateUser("user-1", { email: "alice@example.com" })
    ).rejects.toThrow(service.EmailConflictError);
  });
});

describe("deleteUser", () => {
  it("soft-deletes user successfully", async () => {
    vi.mocked(repo.softDelete).mockResolvedValue({ id: "user-1" });
    await expect(service.deleteUser("user-1")).resolves.toBeUndefined();
  });

  it("throws UserNotFoundError when user missing", async () => {
    vi.mocked(repo.softDelete).mockResolvedValue(null as unknown as DeleteRow);
    await expect(service.deleteUser("missing")).rejects.toThrow(service.UserNotFoundError);
  });
});
