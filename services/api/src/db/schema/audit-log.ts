import { pgTable, serial, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  targetId: integer('target_id').notNull(),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
