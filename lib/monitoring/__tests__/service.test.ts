import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/monitoring/repository");
vi.mock("@/shared/notifications", () => ({
  createNotificationService: vi.fn(),
}));

import * as repo from "@/lib/monitoring/repository";
import { createNotificationService } from "@/shared/notifications";
import {
  processCheckResult,
  DeviceNotFoundError,
  getDevice,
} from "../service";
import type { Device } from "../schema";

const mockNotify = vi.fn().mockResolvedValue([]);
const mockRepo = vi.mocked(repo);
const mockCreateNS = vi.mocked(createNotificationService);

const baseDevice: Device = {
  id: "d1",
  name: "Core Switch",
  host: "192.168.1.1",
  port: 22,
  type: "switch",
  status: "up",
  checkIntervalSec: 60,
  consecutiveFailures: 0,
  lastCheckedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateNS.mockReturnValue({ notify: mockNotify } as never);
  vi.stubEnv("MONITORING_FAIL_THRESHOLD", "3");
});

describe("processCheckResult — success", () => {
  it("writes up status log and resets consecutive failures", async () => {
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...baseDevice,
      consecutiveFailures: 0,
      status: "up",
    });
    mockRepo.findOpenAlert.mockResolvedValue(null as never);

    await processCheckResult(baseDevice, { success: true, latencyMs: 12 });

    expect(mockRepo.insertStatusLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "up", latencyMs: 12 })
    );
    expect(mockRepo.updateDevice).toHaveBeenCalledWith(
      "d1",
      expect.objectContaining({ status: "up", consecutiveFailures: 0 })
    );
  });
});

describe("processCheckResult — failure below threshold", () => {
  it("increments failures but does not transition to down", async () => {
    const device = { ...baseDevice, consecutiveFailures: 1 };
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...device,
      consecutiveFailures: 2,
      status: "up",
    });

    await processCheckResult(device, { success: false, error: "timeout" });

    expect(mockRepo.updateDevice).toHaveBeenCalledWith(
      "d1",
      expect.objectContaining({ consecutiveFailures: 2, status: "up" })
    );
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("processCheckResult — transition to down", () => {
  it("opens alert and notifies on first down transition", async () => {
    const device = { ...baseDevice, consecutiveFailures: 2 };
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...device,
      consecutiveFailures: 3,
      status: "down",
    });
    mockRepo.findOpenAlert.mockResolvedValue(null as never);
    mockRepo.insertAlert.mockResolvedValue({} as never);

    await processCheckResult(device, {
      success: false,
      error: "Connection refused",
    });

    expect(mockRepo.insertAlert).toHaveBeenCalledWith("d1", "Connection refused");
    expect(mockNotify).toHaveBeenCalledOnce();
  });

  it("deduplicates: ongoing down only updates last_error, no new notification", async () => {
    const device = {
      ...baseDevice,
      status: "down" as const,
      consecutiveFailures: 5,
    };
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...device,
      consecutiveFailures: 6,
    });
    mockRepo.findOpenAlert.mockResolvedValue({
      id: "a1",
      deviceId: "d1",
      firstSeen: new Date(),
      resolvedAt: null,
      lastError: "old",
    });
    mockRepo.updateAlertError.mockResolvedValue({} as never);

    await processCheckResult(device, { success: false, error: "Still down" });

    expect(mockRepo.insertAlert).not.toHaveBeenCalled();
    expect(mockRepo.updateAlertError).toHaveBeenCalledWith("a1", "Still down");
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("processCheckResult — recovery", () => {
  it("closes open alert and notifies on recovery", async () => {
    const device = { ...baseDevice, status: "down" as const };
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...device,
      status: "up",
      consecutiveFailures: 0,
    });
    mockRepo.findOpenAlert.mockResolvedValue({
      id: "a1",
      deviceId: "d1",
      firstSeen: new Date(),
      resolvedAt: null,
      lastError: "err",
    });
    mockRepo.resolveAlert.mockResolvedValue({} as never);

    await processCheckResult(device, { success: true, latencyMs: 5 });

    expect(mockRepo.resolveAlert).toHaveBeenCalledWith("a1");
    expect(mockNotify).toHaveBeenCalledOnce();
  });

  it("no-op recovery if no open alert exists", async () => {
    const device = { ...baseDevice, status: "down" as const };
    mockRepo.insertStatusLog.mockResolvedValue({} as never);
    mockRepo.updateDevice.mockResolvedValue({
      ...device,
      status: "up",
      consecutiveFailures: 0,
    });
    mockRepo.findOpenAlert.mockResolvedValue(null as never);

    await processCheckResult(device, { success: true, latencyMs: 5 });

    expect(mockRepo.resolveAlert).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

describe("getDevice", () => {
  it("throws DeviceNotFoundError when device missing", async () => {
    mockRepo.findDeviceById.mockResolvedValue(null as never);
    await expect(getDevice("missing")).rejects.toThrow(DeviceNotFoundError);
  });
});
