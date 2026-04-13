import { describe, it, expect, vi, beforeEach } from "vitest";
import * as service from "../service";
import * as repo from "../repository";
import type { Ticket } from "@/lib/db/schema/tickets";

vi.mock("../repository");
vi.mock("@/shared/notifications", () => ({
  createNotificationService: vi.fn(() => ({
    notify: vi.fn().mockResolvedValue([]),
  })),
}));

import { createNotificationService } from "@/shared/notifications";

const mockTicket: Ticket = {
  id: "ticket-1",
  title: "Email not working",
  description: "Cannot send emails since this morning",
  priority: "high",
  category: "Infrastructure",
  assetId: null,
  status: "open",
  createdBy: "user-1",
  assigneeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockItStaff = [
  { id: "staff-1", email: "staff@example.com", name: "IT Staff" },
];

beforeEach(() => vi.clearAllMocks());

describe("createTicket", () => {
  it("creates ticket and notifies IT staff", async () => {
    vi.mocked(repo.create).mockResolvedValue(mockTicket);
    vi.mocked(repo.findItStaffUsers).mockResolvedValue(mockItStaff);

    const notifyMock = vi.fn().mockResolvedValue([]);
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    const result = await service.createTicket(
      {
        title: "Email not working",
        description: "Cannot send emails since this morning",
        priority: "high",
        category: "Infrastructure",
      },
      "user-1"
    );

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Email not working",
        createdBy: "user-1",
      })
    );
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock).toHaveBeenCalledWith(
      [{ userId: "staff-1", email: "staff@example.com", name: "IT Staff" }],
      expect.objectContaining({ channel: "in-app" })
    );
    expect(result).toEqual(mockTicket);
  });

  it("does not throw when notification fails", async () => {
    vi.mocked(repo.create).mockResolvedValue(mockTicket);
    vi.mocked(repo.findItStaffUsers).mockResolvedValue(mockItStaff);

    const notifyMock = vi.fn().mockRejectedValue(new Error("SMTP down"));
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      service.createTicket(
        {
          title: "Test",
          description: "desc",
          priority: "low",
          category: "Hardware",
        },
        "user-1"
      )
    ).resolves.toEqual(mockTicket);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[tickets] notification failed:"),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("skips notification when no IT staff exist", async () => {
    vi.mocked(repo.create).mockResolvedValue(mockTicket);
    vi.mocked(repo.findItStaffUsers).mockResolvedValue([]);

    const notifyMock = vi.fn();
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    await service.createTicket(
      {
        title: "Test",
        description: "desc",
        priority: "low",
        category: "Hardware",
      },
      "user-1"
    );

    expect(notifyMock).not.toHaveBeenCalled();
  });
});
