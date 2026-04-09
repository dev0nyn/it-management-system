import { pgTable, serial, varchar, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { assets } from './assets.js'

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'resolved',
  'closed',
])

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: ticketStatusEnum('status').notNull().default('open'),
  priority: varchar('priority', { length: 50 }).notNull().default('medium'),
  category: varchar('category', { length: 100 }),
  createdById: integer('created_by_id').references(() => users.id),
  assignedToId: integer('assigned_to_id').references(() => users.id),
  assetId: integer('asset_id').references(() => assets.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
