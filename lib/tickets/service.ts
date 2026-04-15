import { createNotificationService } from "@/shared/notifications";
import * as repo from "./repository";

export class TicketNotFoundError extends Error {}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  assetId?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "resolved" | "closed";
  priority?: "low" | "medium" | "high" | "urgent";
  category?: string;
  assigneeId?: string | null;
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

export async function getTickets() {
  return repo.findAll();
}

export async function getTicket(id: string) {
  const ticket = await repo.findById(id);
  if (!ticket) throw new TicketNotFoundError(`Ticket ${id} not found`);
  return ticket;
}

export async function updateTicket(id: string, input: UpdateTicketInput) {
  const existing = await repo.findById(id);
  if (!existing) throw new TicketNotFoundError(`Ticket ${id} not found`);
  const updated = await repo.update(id, input);
  if (!updated) throw new TicketNotFoundError(`Ticket ${id} not found`);
  return updated;
}

export async function deleteTicket(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new TicketNotFoundError(`Ticket ${id} not found`);
  await repo.remove(id);
}
