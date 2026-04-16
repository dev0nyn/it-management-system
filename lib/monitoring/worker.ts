import { Queue, Worker } from "bullmq";
import * as net from "net";
import { getRedis } from "@/lib/redis";
import * as repo from "./repository";
import * as service from "./service";

const QUEUE_NAME = "device-health-checks";

let _queue: Queue | null = null;

export function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  }
  return _queue;
}

interface CheckJobData {
  deviceId: string;
}

export async function tcpCheck(
  host: string,
  port: number
): Promise<{ success: true; latencyMs: number } | { success: false; error: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(5000);

    socket.once("connect", () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ success: true, latencyMs });
    });

    socket.once("error", (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve({ success: false, error: "Connection timed out" });
    });

    socket.connect(port, host);
  });
}

export function startWorker(): Worker {
  const worker = new Worker<CheckJobData>(
    QUEUE_NAME,
    async (job) => {
      const { deviceId } = job.data;
      const device = await repo.findDeviceById(deviceId);
      if (!device) return; // device was deleted

      const result = await tcpCheck(device.host, device.port);
      await service.processCheckResult(device, result);
    },
    { connection: getRedis() }
  );

  worker.on("failed", (job, err) => {
    console.error(`[monitoring] job ${job?.id} failed:`, err);
  });

  return worker;
}

export async function syncSchedulers(): Promise<void> {
  const q = getQueue();
  const devices = await repo.findAllDevices();

  // Remove schedulers for deleted devices
  const schedulers = await q.getJobSchedulers();
  const deviceIds = new Set(devices.map((d) => d.id));
  for (const scheduler of schedulers) {
    if (!deviceIds.has(scheduler.key)) {
      await q.removeJobScheduler(scheduler.key);
    }
  }

  // Upsert schedulers for all active devices
  for (const device of devices) {
    await q.upsertJobScheduler(
      device.id,
      { every: device.checkIntervalSec * 1000 },
      { name: "check", data: { deviceId: device.id } }
    );
  }
}

export async function upsertDeviceScheduler(
  deviceId: string,
  intervalSec: number
): Promise<void> {
  const q = getQueue();
  await q.upsertJobScheduler(
    deviceId,
    { every: intervalSec * 1000 },
    { name: "check", data: { deviceId } }
  );
}

export async function removeDeviceScheduler(deviceId: string): Promise<void> {
  const q = getQueue();
  await q.removeJobScheduler(deviceId);
}
