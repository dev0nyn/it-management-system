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
  jiraIssueKey: null,
  jiraSyncedAt: null,
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

describe("updateTicket — reassignment notification", () => {
  const mockTicketWithJoins = {
    ...mockTicket,
    reporterName: "Alice",
    assigneeName: null,
  };

  it("notifies new assignee when assigneeId changes", async () => {
    const assignee = { id: "staff2", email: "staff2@example.com", name: "New Staff" };
    vi.mocked(repo.findById).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: null });
    vi.mocked(repo.update).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: "staff2" });
    vi.mocked(repo.findUserById).mockResolvedValue(assignee);

    const notifyMock = vi.fn().mockResolvedValue([]);
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    await service.updateTicket("ticket-1", { assigneeId: "staff2" });

    expect(notifyMock).toHaveBeenCalledOnce();
    expect(notifyMock).toHaveBeenCalledWith(
      [{ userId: "staff2", email: "staff2@example.com", name: "New Staff" }],
      expect.objectContaining({ channel: "in-app" })
    );
  });

  it("does not notify when assigneeId is not in the update payload", async () => {
    vi.mocked(repo.findById).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: "staff2" });
    vi.mocked(repo.update).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: "staff2" });

    const notifyMock = vi.fn();
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    await service.updateTicket("ticket-1", { title: "Updated title" });

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("does not notify when assigneeId is set to null (unassign)", async () => {
    vi.mocked(repo.findById).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: "staff2" });
    vi.mocked(repo.update).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: null });

    const notifyMock = vi.fn();
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    await service.updateTicket("ticket-1", { assigneeId: null });

    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("does not throw if reassignment notification fails", async () => {
    vi.mocked(repo.findById).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: null });
    vi.mocked(repo.update).mockResolvedValue({ ...mockTicketWithJoins, assigneeId: "staff2" });
    vi.mocked(repo.findUserById).mockResolvedValue({ id: "staff2", email: "s@x.com", name: "S" });

    const notifyMock = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.mocked(createNotificationService).mockReturnValue({ notify: notifyMock });

    await expect(service.updateTicket("ticket-1", { assigneeId: "staff2" })).resolves.not.toThrow();
  });

  it("throws TicketNotFoundError when ticket does not exist", async () => {
    vi.mocked(repo.findById).mockResolvedValue(null as never);

    await expect(service.updateTicket("missing", { title: "x" })).rejects.toThrow(
      service.TicketNotFoundError
    );
  });
});
