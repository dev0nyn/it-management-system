import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tickets, ticketEvents } from '../db/index.js'

export async function listTickets(actorRole: string, actorId: number) {
  // end_user sees only their own tickets; admin/it_staff see all
  if (actorRole === 'end_user') {
    return db.select().from(tickets).where(eq(tickets.createdById, actorId))
  }
  return db.select().from(tickets)
}

export async function getTicketById(id: number) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id))
  return ticket ?? null
}

export async function createTicket(data: {
  title: string
  description?: string
  priority?: string
  category?: string
  assetId?: number
  createdById: number
}) {
  const [ticket] = await db.insert(tickets).values(data).returning()
  // Log creation event
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    actorId: data.createdById,
    eventType: 'created',
    newValue: 'open',
  })
  return ticket
}

export async function updateTicket(
  id: number,
  actorId: number,
  data: Partial<{
    title: string
    description: string
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
    priority: string
    assignedToId: number
  }>,
) {
  const existing = await getTicketById(id)
  if (!existing) return null

  const [ticket] = await db
    .update(tickets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tickets.id, id))
    .returning()

  // Log status change event
  if (data.status && data.status !== existing.status) {
    await db.insert(ticketEvents).values({
      ticketId: id,
      actorId,
      eventType: 'status_changed',
      oldValue: existing.status,
      newValue: data.status,
    })
  }

  return ticket
}

export async function getTicketEvents(ticketId: number) {
  return db.select().from(ticketEvents).where(eq(ticketEvents.ticketId, ticketId))
}
