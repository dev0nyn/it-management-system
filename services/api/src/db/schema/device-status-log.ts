import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { devices } from './devices.js'
import { deviceStatusEnum } from './devices.js'

export const deviceStatusLog = pgTable('device_status_log', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .notNull()
    .references(() => devices.id),
  status: deviceStatusEnum('status').notNull(),
  latencyMs: integer('latency_ms'),
  errorMessage: text('error_message'),
  checkedAt: timestamp('checked_at').notNull().defaultNow(),
})
