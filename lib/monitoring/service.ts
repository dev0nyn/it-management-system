import { createNotificationService } from "@/shared/notifications";
import * as repo from "./repository";
import type { Device } from "./schema";

export class DeviceNotFoundError extends Error {}

const FAIL_THRESHOLD = parseInt(
  process.env.MONITORING_FAIL_THRESHOLD ?? "3",
  10
);

// --- Device CRUD ---

export async function listDevices() {
  return repo.findAllDevices();
}

export async function getDevice(id: string) {
  const device = await repo.findDeviceById(id);
  if (!device) throw new DeviceNotFoundError(`Device ${id} not found`);
  return device;
}

export async function createDevice(input: {
  name: string;
  host: string;
  port: number;
  type: Device["type"];
  checkIntervalSec: number;
}) {
  return repo.createDevice(input);
}

export async function updateDevice(
  id: string,
  input: {
    name?: string;
    host?: string;
    port?: number;
    type?: Device["type"];
    checkIntervalSec?: number;
  }
) {
  const existing = await repo.findDeviceById(id);
  if (!existing) throw new DeviceNotFoundError(`Device ${id} not found`);
  const updated = await repo.updateDevice(id, input);
  if (!updated) throw new DeviceNotFoundError(`Device ${id} not found`);
  return updated;
}

export async function deleteDevice(id: string) {
  const existing = await repo.findDeviceById(id);
  if (!existing) throw new DeviceNotFoundError(`Device ${id} not found`);
  await repo.deleteDevice(id);
}

export async function getStatusLog(deviceId: string) {
  const existing = await repo.findDeviceById(deviceId);
  if (!existing) throw new DeviceNotFoundError(`Device ${deviceId} not found`);
  return repo.findStatusLog(deviceId);
}

export async function listAlerts(opts: {
  deviceId?: string;
  status?: "open" | "resolved";
}) {
  return repo.findAlerts(opts);
}

// --- Health check result processing (called by worker) ---

export async function processCheckResult(
  device: Device,
  result:
    | { success: true; latencyMs: number }
    | { success: false; error: string }
) {
  const prevStatus = device.status;

  // 1. Write status log
  if (result.success) {
    await repo.insertStatusLog({
      deviceId: device.id,
      status: "up",
      latencyMs: result.latencyMs,
    });
  } else {
    await repo.insertStatusLog({
      deviceId: device.id,
      status: "down",
      error: result.error,
    });
  }

  // 2. Update device counters + status
  let newStatus: "up" | "down" | "unknown" = prevStatus;
  let consecutiveFailures = device.consecutiveFailures;

  if (result.success) {
    consecutiveFailures = 0;
    newStatus = "up";
  } else {
    consecutiveFailures += 1;
    if (consecutiveFailures >= FAIL_THRESHOLD) {
      newStatus = "down";
    }
  }

  await repo.updateDevice(device.id, {
    status: newStatus,
    consecutiveFailures,
    lastCheckedAt: new Date(),
  });

  // 3. Alert transitions
  if (prevStatus !== "down" && newStatus === "down") {
    await handleDown(device, !result.success ? result.error : "");
  } else if (
    prevStatus === "down" &&
    newStatus === "down" &&
    !result.success
  ) {
    // Ongoing failure — update last_error only (dedup)
    const openAlert = await repo.findOpenAlert(device.id);
    if (openAlert) {
      await repo.updateAlertError(openAlert.id, result.error);
    }
  } else if (prevStatus === "down" && newStatus === "up") {
    await handleRecovery(device);
  }
}

async function handleDown(device: Device, lastError: string) {
  const openAlert = await repo.findOpenAlert(device.id);
  if (openAlert) {
    await repo.updateAlertError(openAlert.id, lastError);
    return;
  }

  await repo.insertAlert(device.id, lastError);

  try {
    const notifier = createNotificationService();
    await notifier.notify([], {
      channel: "in-app",
      inApp: {
        title: `Device down: ${device.name}`,
        body: `${device.host}:${device.port} — ${lastError}`,
      },
    });
  } catch (err) {
    console.error("[monitoring] down notification failed:", err);
  }
}

async function handleRecovery(device: Device) {
  const openAlert = await repo.findOpenAlert(device.id);
  if (!openAlert) return;

  await repo.resolveAlert(openAlert.id);

  try {
    const notifier = createNotificationService();
    await notifier.notify([], {
      channel: "in-app",
      inApp: {
        title: `Device recovered: ${device.name}`,
        body: `${device.host}:${device.port} is back online`,
      },
    });
  } catch (err) {
    console.error("[monitoring] recovery notification failed:", err);
  }
}
