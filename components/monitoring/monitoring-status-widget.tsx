"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api-client";
import { Activity, CheckCircle2, WifiOff, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface WidgetData {
  upCount: number;
  downCount: number;
  openAlerts: number;
  totalDevices: number;
}

export function MonitoringStatusWidget() {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [devRes, alertRes] = await Promise.all([
          authFetch("/api/v1/devices"),
          authFetch("/api/v1/alerts?status=open"),
        ]);

        if (devRes.ok && alertRes.ok) {
          const { data: devices } = await devRes.json();
          const { data: alerts } = await alertRes.json();
          setData({
            upCount: devices.filter((d: { status: string }) => d.status === "up").length,
            downCount: devices.filter((d: { status: string }) => d.status === "down").length,
            openAlerts: alerts.filter((a: { resolvedAt: string | null }) => !a.resolvedAt).length,
            totalDevices: devices.length,
          });
        }
      } catch {
        // widget failure is silent — dashboard still usable
      }
    }
    load();
  }, []);

  if (!data) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col"
      data-testid="monitoring-widget"
    >
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" />
            Infrastructure Status
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {data.totalDevices} monitored device{data.totalDevices !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/monitoring"
          className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-lg transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="p-4 sm:p-5 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span
            className="text-xl font-bold text-emerald-600 dark:text-emerald-400"
            data-testid="widget-up-count"
          >
            {data.upCount}
          </span>
          <span className="text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/70">
            Online
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-500/10">
          <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span
            className="text-xl font-bold text-red-600 dark:text-red-400"
            data-testid="widget-down-count"
          >
            {data.downCount}
          </span>
          <span className="text-[10px] font-medium text-red-600/70 dark:text-red-400/70">
            Offline
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span
            className="text-xl font-bold text-amber-600 dark:text-amber-400"
            data-testid="widget-alert-count"
          >
            {data.openAlerts}
          </span>
          <span className="text-[10px] font-medium text-amber-600/70 dark:text-amber-400/70">
            Alerts
          </span>
        </div>
      </div>
    </div>
  );
}
