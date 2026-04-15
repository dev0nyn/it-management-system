import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { tickets, type NewTicket, type Ticket } from "@/lib/db/schema/tickets";
import { users } from "@/lib/db/schema/users";

const reporterAlias = alias(users, "reporter");
const assigneeAlias = alias(users, "assignee");

const withJoins = () =>
  db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      priority: tickets.priority,
      category: tickets.category,
      assetId: tickets.assetId,
      createdBy: tickets.createdBy,
      assigneeId: tickets.assigneeId,
      reporterName: reporterAlias.name,
      assigneeName: assigneeAlias.name,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .leftJoin(reporterAlias, eq(tickets.createdBy, reporterAlias.id))
    .leftJoin(assigneeAlias, eq(tickets.assigneeId, assigneeAlias.id));

export async function create(data: NewTicket) {
  const [ticket] = await db.insert(tickets).values(data).returning();
  return ticket;
}

export async function findAll() {
  return withJoins().orderBy(tickets.createdAt);
}

export async function findById(id: string) {
  const rows = await withJoins().where(eq(tickets.id, id));
  return rows[0] ?? null;
}

export async function update(
  id: string,
  data: Partial<
    Pick<Ticket, "title" | "description" | "status" | "priority" | "category" | "assigneeId">
  >
) {
  await db
    .update(tickets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tickets.id, id));
  return findById(id);
}

export async function remove(id: string) {
  const [deleted] = await db.delete(tickets).where(eq(tickets.id, id)).returning();
  return deleted ?? null;
}

export async function findItStaffUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, "it_staff"));
}
