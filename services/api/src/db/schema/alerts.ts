import { pgTable, serial, integer, varchar, timestamp, text } from 'drizzle-orm/pg-core'
import { devices } from './devices.js'

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .notNull()
    .references(() => devices.id),
  status: varchar('status', { length: 50 }).notNull(),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at'),
  lastErrorMessage: text('last_error_message'),
})
