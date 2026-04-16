import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const deviceTypeEnum = pgEnum("device_type", [
  "server",
  "switch",
  "router",
  "firewall",
  "ap",
]);

export const deviceStatusEnum = pgEnum("device_status", [
  "up",
  "down",
  "unknown",
]);

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(80),
  type: deviceTypeEnum("type").notNull(),
  status: deviceStatusEnum("status").notNull().default("unknown"),
  checkIntervalSec: integer("check_interval_sec").notNull().default(60),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deviceStatusLog = pgTable("device_status_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull(),
  status: deviceStatusEnum("status").notNull(),
  latencyMs: integer("latency_ms"),
  error: text("error"),
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull(),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  lastError: text("last_error"),
});

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type DeviceStatusLog = typeof deviceStatusLog.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
