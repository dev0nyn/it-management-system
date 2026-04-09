// Notification service — Story 0.4 interface implementation
// In-app / webhook notifications for IT staff
// TODO: wire to real email/webhook delivery in a follow-up story

interface TicketCreatedPayload {
  ticketId: number
  title: string
  createdById: number
}

interface TicketUpdatedPayload {
  ticketId: number
  updatedById: number
  changes: Record<string, unknown>
}

export async function notifyTicketCreated(payload: TicketCreatedPayload): Promise<void> {
  // Stub: log to console; replace with actual delivery (email, Slack, webhook)
  console.info('[notify] New ticket created:', payload)
}

export async function notifyTicketUpdated(payload: TicketUpdatedPayload): Promise<void> {
  console.info('[notify] Ticket updated:', payload)
}
