import { pgTable, serial, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const deviceStatusEnum = pgEnum('device_status', ['up', 'down', 'maintenance'])

export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  hostOrIp: varchar('host_or_ip', { length: 255 }).notNull(),
  type: varchar('type', { length: 100 }).notNull(),
  checkIntervalSec: integer('check_interval_sec').notNull().default(60),
  status: deviceStatusEnum('status').notNull().default('up'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
