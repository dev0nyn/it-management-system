import { pgTable, serial, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetStatusEnum = pgEnum('asset_status', [
  'available',
  'assigned',
  'maintenance',
  'retired',
])

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  tag: varchar('tag', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }),
  status: assetStatusEnum('status').notNull().default('available'),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
