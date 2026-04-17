import { createNotificationService } from "@/shared/notifications";
import * as repo from "./repository";
import { sendInApp } from "@/lib/notifications/service";

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
      await Promise.all(
        itStaff.map((u) =>
          sendInApp(u.id, "New ticket submitted", `[${input.priority.toUpperCase()}] ${input.title}`, `/tickets`)
        )
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

  // Write change events + notify affected parties
  try {
    const actor = actorId ? await repo.findUserById(actorId) : null;
    const actorName = actor?.name ?? null;
    const events: Array<{ eventType: string; oldValue: string | null; newValue: string | null }> = [];
    const notifParts: string[] = [];

    if (input.status && input.status !== existing.status) {
      events.push({ eventType: "status_changed", oldValue: existing.status, newValue: input.status });
      notifParts.push(`Status → ${input.status.replace("_", " ")}`);
    }
    if (input.priority && input.priority !== existing.priority) {
      events.push({ eventType: "priority_changed", oldValue: existing.priority, newValue: input.priority });
      notifParts.push(`Priority → ${input.priority}`);
    }
    if (input.category && input.category !== existing.category) {
      events.push({ eventType: "category_changed", oldValue: existing.category, newValue: input.category });
      notifParts.push(`Category → ${input.category}`);
    }
    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      if (input.assigneeId) {
        const assignee = await repo.findUserById(input.assigneeId);
        events.push({ eventType: "assigned", oldValue: existing.assigneeName ?? null, newValue: assignee?.name ?? input.assigneeId });
      } else {
        events.push({ eventType: "unassigned", oldValue: existing.assigneeName ?? null, newValue: null });
      }
    }
    if (input.title !== undefined && input.title !== existing.title) {
      events.push({ eventType: "title_changed", oldValue: existing.title, newValue: input.title });
      notifParts.push("Title updated");
    }
    if (input.description !== undefined && input.description !== existing.description) {
      events.push({ eventType: "description_changed", oldValue: existing.description, newValue: input.description });
      notifParts.push("Description updated");
    }

    if (actorId) {
      for (const e of events) {
        await repo.createEvent({ ticketId: id, actorId, actorName, ...e });
      }
    }

    // Collect recipients for general field-change notifications (reporter + current assignee, not the actor)
    const generalRecipients = new Set<string>();
    if (existing.createdBy !== actorId) generalRecipients.add(existing.createdBy);
    if (existing.assigneeId && existing.assigneeId !== actorId) generalRecipients.add(existing.assigneeId);

    // Notify reporter and current assignee of any field changes
    if (notifParts.length > 0) {
      const notifTitle = `Ticket updated: ${updated.title}`;
      const notifBody = notifParts.join(" · ");
      await Promise.all(
        [...generalRecipients].map((uid) => sendInApp(uid, notifTitle, notifBody, `/tickets`))
      );
    }

    // Notify the new assignee specifically when assignment changes
    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
    if (assigneeChanged && input.assigneeId) {
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
        // Skip DB persist if already covered by the general batch above
        if (!generalRecipients.has(assignee.id)) {
          await sendInApp(
            assignee.id,
            "Ticket assigned to you",
            `[${updated.priority.toUpperCase()}] ${updated.title}`,
            `/tickets`
          );
        }
      }
    }
  } catch (err) {
    console.error("[tickets] failed to write change events or notify:", err);
  }

  return updated;
}

export async function deleteTicket(id: string, actorId?: string) {
  const existing = await repo.findById(id);
  if (!existing) throw new TicketNotFoundError(`Ticket ${id} not found`);

  const actor = actorId ? await repo.findUserById(actorId) : null;
  const actorName = actor?.name ?? "Someone";

  await repo.remove(id);

  // Notify all admins and IT staff that a ticket was deleted
  try {
    const itStaff = await repo.findItStaffUsers();
    const admins = await repo.findAdminUsers();
    const recipients = [
      ...itStaff,
      ...admins.filter((a) => !itStaff.some((s) => s.id === a.id)),
    ].filter((u) => u.id !== actorId);

    await Promise.all(
      recipients.map((u) =>
        sendInApp(
          u.id,
          "Ticket deleted",
          `"${existing.title}" was deleted by ${actorName}`,
          `/tickets`
        )
      )
    );
  } catch (err) {
    console.error("[tickets] delete notification failed:", err);
  }
}
