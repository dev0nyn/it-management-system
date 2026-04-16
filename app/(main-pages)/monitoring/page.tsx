"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ArrowUpDown,
  Signal,
  Shield,
  Trash2,
} from "lucide-react";

type DeviceType = "server" | "switch" | "router" | "firewall" | "ap";
type DeviceStatus = "up" | "down" | "unknown";

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  host: string;
  port: number;
  status: DeviceStatus;
  checkIntervalSec: number;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Alert {
  id: string;
  deviceId: string;
  firstSeen: string;
  resolvedAt: string | null;
  lastError: string | null;
}

const statusConfig: Record<DeviceStatus, { label: string; className: string; dotClass: string }> = {
  up: { label: "Up", className: "text-emerald-600 dark:text-emerald-400", dotClass: "bg-emerald-500 shadow-emerald-500/40" },
  down: { label: "Down", className: "text-red-600 dark:text-red-400", dotClass: "bg-red-500 shadow-red-500/40 animate-pulse" },
  unknown: { label: "Unknown", className: "text-slate-500 dark:text-slate-400", dotClass: "bg-slate-400" },
};

const typeIcons: Record<DeviceType, React.ElementType> = {
  server: Server,
  switch: ArrowUpDown,
  router: Wifi,
  firewall: Shield,
  ap: Signal,
};

export default function MonitoringPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [devRes, alertRes] = await Promise.all([
        authFetch("/api/v1/devices"),
        authFetch("/api/v1/alerts"),
      ]);

      if (devRes.ok) {
        const d = await devRes.json();
        setDevices(d.data ?? []);
      }
      if (alertRes.ok) {
        const a = await alertRes.json();
        setAlerts(a.data ?? []);
      }
    } catch {
      setError("Failed to load monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this device?")) return;
    await authFetch(`/api/v1/devices/${id}`, { method: "DELETE" });
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setAlerts((prev) => prev.filter((a) => a.deviceId !== id));
  }

  const upCount = devices.filter((d) => d.status === "up").length;
  const downCount = devices.filter((d) => d.status === "down").length;
  const openAlerts = alerts.filter((a) => !a.resolvedAt).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-500 dark:text-slate-400">Loading monitoring data…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Monitoring
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time infrastructure health overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="rounded-xl h-10 gap-2 border-slate-200 dark:border-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="up-count">{upCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Up</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="down-count">{downCount}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Down</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
              <Activity className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-700 dark:text-white">{devices.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Devices</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="alert-count">{openAlerts}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Open Alerts</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Device List */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Devices</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {devices.length} registered device{devices.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Activity className="h-3.5 w-3.5" />
                <span>Auto-refresh: 30s</span>
              </div>
            </div>

            {devices.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No devices registered yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[600px] overflow-y-auto">
                {devices.map((device) => {
                  const statusCfg = statusConfig[device.status];
                  const TypeIcon = typeIcons[device.type] ?? Server;

                  return (
                    <div
                      key={device.id}
                      className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      data-testid="device-row"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                            <TypeIcon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm ${statusCfg.dotClass}`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 dark:text-white font-mono">
                              {device.name}
                            </span>
                            <span className={`text-[10px] font-semibold ${statusCfg.className}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                            <span>{device.host}:{device.port}</span>
                            <span>&middot;</span>
                            <span>{device.type}</span>
                            {device.lastCheckedAt && (
                              <>
                                <span>&middot;</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(device.lastCheckedAt).toLocaleTimeString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(device.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                          aria-label={`Delete ${device.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="xl:col-span-1">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Alerts</h3>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-0">
                  {openAlerts} open
                </Badge>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">No alerts.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[540px] overflow-y-auto">
                {alerts.map((alert) => {
                  const device = devices.find((d) => d.id === alert.deviceId);
                  const isOpen = !alert.resolvedAt;
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 border-l-[3px] ${isOpen ? "border-l-red-500 bg-red-50/50 dark:bg-red-500/5" : "border-l-slate-200 dark:border-l-white/10 opacity-60"}`}
                      data-testid="alert-row"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold font-mono text-slate-800 dark:text-white">
                          {device?.name ?? alert.deviceId}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${isOpen ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"}`}>
                          {isOpen ? "open" : "resolved"}
                        </span>
                      </div>
                      {alert.lastError && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.lastError}</p>
                      )}
                      <div className="flex items-center mt-2">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.firstSeen).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
