import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'

export const rolesEnum = pgEnum('user_roles', ['admin', 'it_staff', 'end_user'])
export const assetStatusEnum = pgEnum('asset_status', ['in_stock', 'assigned', 'repair', 'retired'])
export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'resolved',
  'closed',
])
export const deviceStatusEnum = pgEnum('device_status', ['up', 'down', 'maintenance'])

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: rolesEnum('role').default('end_user').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: text('description'),
})

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  tag: varchar('tag', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }),
  status: assetStatusEnum('status').default('in_stock').notNull(),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const assetAssignments = pgTable('asset_assignments', {
  id: serial('id').primaryKey(),
  assetId: integer('asset_id')
    .references(() => assets.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  returnedAt: timestamp('returned_at'),
  notes: text('notes'),
})

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description').notNull(),
  status: ticketStatusEnum('status').default('open').notNull(),
  priority: varchar('priority', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  createdById: integer('created_by_id')
    .references(() => users.id)
    .notNull(),
  assignedToId: integer('assigned_to_id').references(() => users.id),
  assetId: integer('asset_id').references(() => assets.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const ticketEvents = pgTable('ticket_events', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id')
    .references(() => tickets.id)
    .notNull(),
  actorId: integer('actor_id')
    .references(() => users.id)
    .notNull(),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  hostOrIp: varchar('host_or_ip', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  checkIntervalSec: integer('check_interval_sec').default(60).notNull(),
  status: deviceStatusEnum('status').default('up').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const deviceStatusLog = pgTable('device_status_log', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id)
    .notNull(),
  status: deviceStatusEnum('status').notNull(),
  latencyMs: integer('latency_ms'),
  errorMessage: text('error_message'),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
})

export const alerts = pgTable('alerts', {
  id: serial('id').primaryKey(),
  deviceId: integer('device_id')
    .references(() => devices.id)
    .notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  lastErrorMessage: text('last_error_message'),
})

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  targetId: integer('target_id'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
