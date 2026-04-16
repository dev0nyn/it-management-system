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

  // Write creation event
  try {
    const actor = await repo.findUserById(createdBy);
    await repo.createEvent({
      ticketId: ticket.id,
      actorId: createdBy,
      actorName: actor?.name ?? null,
      eventType: "ticket_created",
      oldValue: null,
      newValue: null,
    });
  } catch (err) {
    console.error("[tickets] failed to write creation event:", err);
  }

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

export async function updateTicket(id: string, input: UpdateTicketInput, actorId?: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new TicketNotFoundError(`Ticket ${id} not found`);

  const updated = await repo.update(id, input);
  if (!updated) throw new TicketNotFoundError(`Ticket ${id} not found`);

  // Write change events
  if (actorId) {
    try {
      const actor = await repo.findUserById(actorId);
      const actorName = actor?.name ?? null;
      const events: Array<{ eventType: string; oldValue: string | null; newValue: string | null }> = [];

      if (input.status && input.status !== existing.status) {
        events.push({ eventType: "status_changed", oldValue: existing.status, newValue: input.status });
      }
      if (input.priority && input.priority !== existing.priority) {
        events.push({ eventType: "priority_changed", oldValue: existing.priority, newValue: input.priority });
      }
      if (input.category && input.category !== existing.category) {
        events.push({ eventType: "category_changed", oldValue: existing.category, newValue: input.category });
      }
      if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
        if (input.assigneeId) {
          const assignee = await repo.findUserById(input.assigneeId);
          events.push({ eventType: "assigned", oldValue: existing.assigneeName ?? null, newValue: assignee?.name ?? input.assigneeId });
        } else {
          events.push({ eventType: "unassigned", oldValue: existing.assigneeName ?? null, newValue: null });
        }
      }
      if (
        (input.title !== undefined && input.title !== existing.title) ||
        (input.description !== undefined && input.description !== existing.description)
      ) {
        events.push({ eventType: "updated", oldValue: null, newValue: null });
      }

      for (const e of events) {
        await repo.createEvent({ ticketId: id, actorId, actorName, ...e });
      }
    } catch (err) {
      console.error("[tickets] failed to write change events:", err);
    }
  }

  // Notify new assignee if assigneeId changed to a non-null value
  const assigneeChanged =
    input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
  if (assigneeChanged && input.assigneeId) {
    try {
      const assignee = await repo.findUserById(input.assigneeId);
      if (assignee) {
        const notifier = createNotificationService();
        await notifier.notify(
          [{ userId: assignee.id, email: assignee.email, name: assignee.name }],
          {
            channel: "in-app",
            inApp: {
              title: "Ticket assigned to you",
              body: `[${updated.priority.toUpperCase()}] ${updated.title}`,
            },
          }
        );
      }
    } catch (err) {
      console.error("[tickets] reassignment notification failed:", err);
    }
  }

  return updated;
}

export async function deleteTicket(id: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new TicketNotFoundError(`Ticket ${id} not found`);
  await repo.remove(id);
}
