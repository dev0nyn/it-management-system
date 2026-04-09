import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core'
import { tickets } from './tickets.js'
import { users } from './users.js'

export const ticketEvents = pgTable('ticket_events', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .notNull()
    .references(() => tickets.id),
  actorId: integer('actor_id').references(() => users.id),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  comment: text('comment'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
