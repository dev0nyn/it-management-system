import { createNotificationService } from "@/shared/notifications";
import * as repo from "./repository";

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assetId?: string;
}

export async function createTicket(input: CreateTicketInput, createdBy: string) {
  const ticket = await repo.create({
    title: input.title,
    description: input.description,
    priority: input.priority,
    category: input.category,
    assetId: input.assetId ?? null,
    createdBy,
  });

  // Notify IT staff — failure must not fail the request
  try {
    const itStaff = await repo.findItStaffUsers();
    if (itStaff.length > 0) {
      const notifier = createNotificationService();
      await notifier.notify(
        itStaff.map((u) => ({ userId: u.id, email: u.email, name: u.name })),
        {
          channel: "in-app",
          inApp: {
            title: "New ticket submitted",
            body: `[${input.priority.toUpperCase()}] ${input.title}`,
          },
        }
      );
    }
  } catch (err) {
    console.error("[tickets] notification failed:", err);
  }

  return ticket;
}
