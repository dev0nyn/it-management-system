import { eq, isNull, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  devices,
  deviceStatusLog,
  alerts,
  type NewDevice,
  type Device,
} from "./schema";

// --- Devices ---

export async function findAllDevices() {
  return db.select().from(devices).orderBy(devices.createdAt);
}

export async function findDeviceById(id: string) {
  const rows = await db.select().from(devices).where(eq(devices.id, id));
  return rows[0] ?? null;
}

export async function createDevice(data: NewDevice) {
  const [device] = await db.insert(devices).values(data).returning();
  return device;
}

export async function updateDevice(
  id: string,
  data: Partial<
    Pick<
      Device,
      | "name"
      | "host"
      | "port"
      | "type"
      | "checkIntervalSec"
      | "status"
      | "consecutiveFailures"
      | "lastCheckedAt"
    >
  >
) {
  const [updated] = await db
    .update(devices)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(devices.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteDevice(id: string) {
  const [deleted] = await db
    .delete(devices)
    .where(eq(devices.id, id))
    .returning();
  return deleted ?? null;
}

// --- Status log ---

export async function insertStatusLog(data: {
  deviceId: string;
  status: "up" | "down";
  latencyMs?: number;
  error?: string;
}) {
  const [row] = await db.insert(deviceStatusLog).values(data).returning();
  return row;
}

export async function findStatusLog(deviceId: string, limit = 50) {
  return db
    .select()
    .from(deviceStatusLog)
    .where(eq(deviceStatusLog.deviceId, deviceId))
    .orderBy(desc(deviceStatusLog.checkedAt))
    .limit(limit);
}

// --- Alerts ---

export async function findOpenAlert(deviceId: string) {
  const rows = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.deviceId, deviceId), isNull(alerts.resolvedAt)));
  return rows[0] ?? null;
}

export async function insertAlert(deviceId: string, lastError: string) {
  const [alert] = await db
    .insert(alerts)
    .values({ deviceId, lastError })
    .returning();
  return alert;
}

export async function updateAlertError(id: string, lastError: string) {
  const [alert] = await db
    .update(alerts)
    .set({ lastError })
    .where(eq(alerts.id, id))
    .returning();
  return alert ?? null;
}

export async function resolveAlert(id: string) {
  const [alert] = await db
    .update(alerts)
    .set({ resolvedAt: new Date() })
    .where(eq(alerts.id, id))
    .returning();
  return alert ?? null;
}

export async function findAlerts(opts: {
  deviceId?: string;
  status?: "open" | "resolved";
}) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (opts.deviceId) {
    conditions.push(eq(alerts.deviceId, opts.deviceId));
  }
  if (opts.status === "open") {
    conditions.push(isNull(alerts.resolvedAt));
  }

  const query = db
    .select({
      id: alerts.id,
      deviceId: alerts.deviceId,
      deviceName: devices.name,
      host: devices.host,
      port: devices.port,
      firstSeen: alerts.firstSeen,
      resolvedAt: alerts.resolvedAt,
      lastError: alerts.lastError,
    })
    .from(alerts)
    .leftJoin(devices, eq(alerts.deviceId, devices.id))
    .orderBy(desc(alerts.firstSeen));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}
