"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { MonitoringStatusWidget } from "@/components/monitoring/monitoring-status-widget";
import { AreaChart, DonutChart } from '@tremor/react';
import { authFetch, getApiBase } from "@/lib/api-client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

// Tailwind v4 safelist for dynamic Tremor color classes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safelist = "bg-fuchsia-500 text-fuchsia-500 fill-fuchsia-500 stroke-fuchsia-500 bg-cyan-500 text-cyan-500 fill-cyan-500 stroke-cyan-500 bg-sky-500 text-sky-500 fill-sky-500 stroke-sky-500 bg-amber-500 text-amber-500 fill-amber-500 stroke-amber-500 bg-emerald-500 text-emerald-500 fill-emerald-500 stroke-emerald-500 bg-violet-500 text-violet-500 fill-violet-500 stroke-violet-500";

interface ApiTicket {
  id: string;
  title: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  createdAt: string;
  createdByEmail?: string;
  assigneeName?: string | null;
}

interface AssetStatusRow { status: string; count: number }
interface DeviceRow { status: string; id: string }

function buildMonthlyData(tickets: ApiTicket[]): { date: string; Tickets: number; Resolved: number }[] {
  const map = new Map<string, { total: number; resolved: number; sortKey: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const sortKey = d.getFullYear() * 100 + d.getMonth();
    map.set(key, { total: 0, resolved: 0, sortKey });
  }
  for (const t of tickets) {
    const d = new Date(t.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const entry = map.get(key);
    if (entry) {
      entry.total++;
      if (t.status === "resolved" || t.status === "closed") entry.resolved++;
    }
  }
  return Array.from(map.entries())
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([date, { total, resolved }]) => ({ date, Tickets: total, Resolved: resolved }));
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [assetRows, setAssetRows] = useState<AssetStatusRow[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<{ up: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const base = getApiBase();
      const [ticketRes, assetRes, deviceRes] = await Promise.all([
        authFetch(`${base}/api/v1/tickets`),
        authFetch(`${base}/api/v1/reports/assets-by-status`),
        authFetch(`${base}/api/v1/devices`),
      ]);

      if (ticketRes.ok) {
        const { data } = await ticketRes.json();
        setTickets(data ?? []);
      }
      if (assetRes.ok) {
        const { data } = await assetRes.json();
        setAssetRows((data?.rows ?? []) as AssetStatusRow[]);
      }
      if (deviceRes.ok) {
        const { data: devices } = await deviceRes.json() as { data: DeviceRow[] };
        setDeviceCounts({
          up: devices.filter((d) => d.status === "up").length,
          total: devices.length,
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);


  // ── Derived values ───────────────────────────────────────────────────────────
  const openCount      = tickets.filter((t) => t.status === "open").length;
  const activeCount    = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const totalAssets    = assetRows.reduce((s, r) => s + r.count, 0);
  const assignedAssets = assetRows.find((r) => r.status === "assigned")?.count ?? 0;
  const assignedPct    = totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0;
  const healthPct      = deviceCounts && deviceCounts.total > 0
    ? Math.round((deviceCounts.up / deviceCounts.total) * 100)
    : null;

  const stats = [
    {
      name: "Active Tickets",
      value: loading ? "—" : String(activeCount),
      description: loading ? "" : `${openCount} open`,
      status: activeCount > 10 ? "urgent" : activeCount > 5 ? "warning" : "good",
    },
    {
      name: "Assets Assigned",
      value: loading ? "—" : `${assignedPct}%`,
      description: loading ? "" : `${assignedAssets} of ${totalAssets}`,
      status: assignedPct >= 70 ? "good" : assignedPct >= 50 ? "warning" : "urgent",
    },
    {
      name: "System Health",
      value: loading ? "—" : healthPct !== null ? `${healthPct}%` : "—",
      description: loading ? "" : deviceCounts
        ? `${deviceCounts.up} / ${deviceCounts.total} up`
        : "No devices",
      status: (healthPct === null || healthPct === 100) ? "good" : healthPct >= 80 ? "warning" : "urgent",
    },
    {
      name: "Open Tickets",
      value: loading ? "—" : String(openCount),
      description: loading ? "" : openCount === 0 ? "All clear" : "Need attention",
      status: openCount === 0 ? "good" : openCount > 5 ? "urgent" : "warning",
    },
  ];

  const ticketData = buildMonthlyData(tickets);
  const assetDonutData = assetRows.map((r) => ({
    name: r.status.replace("_", " "),
    value: r.count,
  }));
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const assetColors = ["sky", "fuchsia", "amber", "emerald"] as const;
  const assetBgColors = ["bg-sky-500", "bg-fuchsia-500", "bg-amber-500", "bg-emerald-500"];

  const statusColorMap: Record<string, string> = {
    open:        "bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    in_progress: "bg-blue-100/80 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    resolved:    "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    closed:      "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400",
  };

  return (
    <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-8 pt-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white mb-1">Dashboard</h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Overview of your IT infrastructure and support.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Refresh"
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
<Link
            href="/reports"
            className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-red-600 text-white hover:bg-red-700 h-9 py-2 px-4 hover:shadow-lg active:scale-95"
          >
            View Reports
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 transition-all hover:shadow-md hover:-translate-y-1 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50 to-transparent dark:from-red-900/20 rounded-bl-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex flex-row items-center justify-between space-y-0 pb-3">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.name}</h3>
              <div className={`h-2.5 w-2.5 rounded-full shadow-sm shrink-0 ${
                stat.status === "urgent"  ? "bg-red-500 animate-pulse shadow-red-500/50" :
                stat.status === "warning" ? "bg-amber-500 shadow-amber-500/50" :
                "bg-emerald-500 shadow-emerald-500/50"
              }`} />
            </div>
            <div>
              <div className={`text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight ${loading ? "animate-pulse" : ""}`}>
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">{stat.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <div className="relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tickets vs Resolved</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monthly IT support request volume</p>
            </div>
            <div className="p-4 sm:p-6 flex-1 w-full overflow-hidden">
              <AreaChart
                className="h-64 sm:h-72 mt-2 sm:mt-4 w-full"
                data={ticketData}
                index="date"
                categories={['Tickets', 'Resolved']}
                colors={['fuchsia', 'cyan']}
                yAxisWidth={45}
                showAnimation={true}
                showGridLines={true}
                curveType="natural"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="relative rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Asset Distribution</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current inventory by status</p>
            </div>
            <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center">
              {assetDonutData.length > 0 ? (
                <>
                  <DonutChart
                    className="h-48 sm:h-64 mt-2 sm:mt-4 w-full"
                    data={assetDonutData}
                    category="value"
                    index="name"
                    colors={[...assetColors]}
                    valueFormatter={(number) => Intl.NumberFormat('us').format(number).toString()}
                    showAnimation={true}
                  />
                  <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full px-2 sm:px-0">
                    {assetDonutData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${assetBgColors[i % assetBgColors.length]}`}></span>
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate capitalize">{item.name}</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-white ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">{loading ? "Loading…" : "No asset data"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-7">
        <div className="lg:col-span-3">
          <MonitoringStatusWidget />
        </div>

        <div className="lg:col-span-4">
          <div className="relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-800 h-full flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Recent Tickets</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Latest issues reported by users</p>
              </div>
              <Link
                href="/tickets"
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium self-start sm:self-auto bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                View All
              </Link>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              {loading ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 min-w-[280px]">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 sm:p-5">
                      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentTickets.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-slate-400 dark:text-slate-500">
                  No tickets yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 min-w-[280px]">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                          {ticket.id.slice(0, 4).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-none text-slate-800 dark:text-white truncate pb-1.5">{ticket.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {ticket.assigneeName ? `Assigned: ${ticket.assigneeName}` : "Unassigned"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center sm:flex-col justify-between sm:justify-center gap-2 sm:gap-1 pl-13 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-50 dark:border-slate-800/50">
                        <div className={`text-[11px] font-semibold px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap ${statusColorMap[ticket.status] ?? ""}`}>
                          {ticket.status.replace("_", " ")}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatRelative(ticket.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
