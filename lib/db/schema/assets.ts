import { pgTable, pgEnum, uuid, text, timestamp, date } from "drizzle-orm/pg-core";
import { users } from "./users";

export const assetStatusEnum = pgEnum("asset_status", [
  "in_stock",
  "assigned",
  "repair",
  "retired",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "laptop",
  "monitor",
  "phone",
  "server",
  "printer",
  "network",
  "peripheral",
]);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  tag: text("tag").notNull().unique(),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  serial: text("serial").notNull(),
  status: assetStatusEnum("status").notNull().default("in_stock"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  purchaseDate: date("purchase_date"),
  warrantyExpiry: date("warranty_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assetAssignments = pgTable("asset_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id")
    .notNull()
    .references(() => assets.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  unassignedAt: timestamp("unassigned_at"),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
export type AssetAssignment = typeof assetAssignments.$inferSelect;
export type NewAssetAssignment = typeof assetAssignments.$inferInsert;
