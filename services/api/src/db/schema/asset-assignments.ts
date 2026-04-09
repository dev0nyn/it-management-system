import { pgTable, serial, integer, timestamp, text } from 'drizzle-orm/pg-core'
import { assets } from './assets.js'
import { users } from './users.js'

export const assetAssignments = pgTable('asset_assignments', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  returnedAt: timestamp('returned_at'),
  notes: text('notes'),
})
