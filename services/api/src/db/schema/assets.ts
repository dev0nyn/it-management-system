import { pgTable, serial, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const assetStatusEnum = pgEnum('asset_status', ['in_stock', 'assigned', 'repair', 'retired'])

export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  tag: varchar('tag', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(),
  serialNumber: varchar('serial_number', { length: 100 }),
  status: assetStatusEnum('status').notNull().default('in_stock'),
  purchaseDate: timestamp('purchase_date'),
  warrantyExpiry: timestamp('warranty_expiry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
