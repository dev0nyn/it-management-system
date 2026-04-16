"use client";

import { useEffect, useState, useCallback } from "react";
import { authFetch, getApiBase } from "@/lib/api-client";
import { AreaChart, BarChart, DonutChart } from "@tremor/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  FileText,
  FileDown,
} from "lucide-react";

// Tailwind v4 safelist for dynamic Tremor color classes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _safelist = "bg-fuchsia-500 text-fuchsia-500 fill-fuchsia-500 stroke-fuchsia-500 bg-cyan-500 text-cyan-500 fill-cyan-500 stroke-cyan-500 bg-sky-500 text-sky-500 fill-sky-500 stroke-sky-500 bg-amber-500 text-amber-500 fill-amber-500 stroke-amber-500 bg-emerald-500 text-emerald-500 fill-emerald-500 stroke-emerald-500 bg-violet-500 text-violet-500 fill-violet-500 stroke-violet-500 bg-rose-500 text-rose-500 fill-rose-500 stroke-rose-500";

const DATE_PRESETS = [
  { label: "Last 7 Days",   days: 7   },
  { label: "Last 30 Days",  days: 30  },
  { label: "Last 3 Months", days: 90  },
  { label: "Last 6 Months", days: 180 },
  { label: "Last Year",     days: 365 },
] as const;

type Preset = (typeof DATE_PRESETS)[number];

interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
  generatedAt: string;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIsoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400 dark:text-slate-500">
      <Minus className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">No {label} data for this period</p>
    </div>
  );
}

function ExportMenu({ reportId, from, to }: { reportId: string; from: string; to: string }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: "csv" | "pdf") {
    if (exporting) return;
    setExporting(true);
    try {
      const qs = `?format=${format}&from=${from}&to=${to}`;
      const res = await authFetch(`${getApiBase()}/api/v1/reports/${reportId}/export${qs}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportId}-${from}-${to}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
        title="Export"
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Export
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-3.5 w-3.5" />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileDown className="h-3.5 w-3.5" />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>(DATE_PRESETS[3]); // Last 6 Months default
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: toIsoDate(daysAgo(DATE_PRESETS[3].days)), to: toIsoDate(new Date()) });

  const [statusData, setStatusData]       = useState<ReportResult | null>(null);
  const [resTimeData, setResTimeData]     = useState<ReportResult | null>(null);
  const [assetsData, setAssetsData]       = useState<ReportResult | null>(null);
  const [activityData, setActivityData]   = useState<ReportResult | null>(null);

  const fetchReports = useCallback(async (p: Preset) => {
    setLoading(true);
    const from = toIsoDate(daysAgo(p.days));
    const to   = toIsoDate(new Date());
    setDateRange({ from, to });
    const qs   = `?from=${from}&to=${to}`;

    try {
      const base = getApiBase();
      const [s, r, a, u] = await Promise.all([
        authFetch(`${base}/api/v1/reports/tickets-by-status${qs}`).then((res) => res.json()),
        authFetch(`${base}/api/v1/reports/tickets-by-resolution-time${qs}`).then((res) => res.json()),
        authFetch(`${base}/api/v1/reports/assets-by-status`).then((res) => res.json()),
        authFetch(`${base}/api/v1/reports/user-activity${qs}`).then((res) => res.json()),
      ]);
      setStatusData(s.data ?? null);
      setResTimeData(r.data ?? null);
      setAssetsData(a.data ?? null);
      setActivityData(u.data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(preset);
  }, [preset, fetchReports]);

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  const statusRows = (statusData?.rows ?? []) as { status: string; count: number }[];
  const openCount      = statusRows.find((r) => r.status === "open")?.count ?? 0;
  const inProgressCount = statusRows.find((r) => r.status === "in_progress")?.count ?? 0;
  const resolvedCount  = statusRows.filter((r) => ["resolved", "closed"].includes(r.status)).reduce((s, r) => s + r.count, 0);

  const resRows = (resTimeData?.rows ?? []) as { category: string; avgHours: number }[];
  const avgResTime = resRows.length > 0
    ? (resRows.reduce((s, r) => s + r.avgHours, 0) / resRows.length).toFixed(1) + "h"
    : "—";

  const assetRows = (assetsData?.rows ?? []) as { status: string; count: number }[];
  const totalAssets    = assetRows.reduce((s, r) => s + r.count, 0);
  const assignedAssets = assetRows.find((r) => r.status === "assigned")?.count ?? 0;

  const kpis = [
    { label: "Open Tickets",         value: String(openCount),       change: "", trend: "flat" as const, good: true  },
    { label: "In Progress",          value: String(inProgressCount), change: "", trend: "flat" as const, good: true  },
    { label: "Resolved This Period", value: String(resolvedCount),   change: "", trend: "up"   as const, good: true  },
    { label: "Avg Resolution Time",  value: avgResTime,              change: "", trend: "down" as const, good: true  },
    { label: "Total Assets",         value: String(totalAssets),     change: "", trend: "flat" as const, good: true  },
    { label: "Assets Assigned",      value: String(assignedAssets),  change: "", trend: "up"   as const, good: true  },
  ];

  // ── Chart shapes ────────────────────────────────────────────────────────────
  const statusChartData = statusRows.map((r) => ({
    status: r.status.replace("_", " "),
    Count: r.count,
  }));

  const resTimeChartData = resRows.map((r) => ({
    category: r.category,
    "Avg Hours": r.avgHours,
  }));

  const assetDonutData = assetRows.map((r) => ({
    name: r.status.replace("_", " "),
    value: r.count,
  }));

  const activityRows = (activityData?.rows ?? []) as { name: string; created: number; resolved: number }[];
  const activityChartData = activityRows
    .filter((r) => r.created > 0 || r.resolved > 0)
    .map((r) => ({ name: r.name, Resolved: r.resolved, Created: r.created }));

  const donutColors = ["sky", "emerald", "amber", "violet"] as const;
  const donutBgColors = ["bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500"];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Analytics and insights for IT operations</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl h-10 px-3 text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none">
              <Calendar className="h-4 w-4" />
              {preset.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DATE_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.label}
                  onClick={() => setPreset(p)}
                  className={preset.label === p.label ? "font-semibold" : ""}
                >
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="bg-red-600 hover:bg-red-700 text-white shadow-md rounded-xl h-10 px-4 gap-2"
            onClick={() => fetchReports(preset)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const TrendIcon = kpi.trend === "up" ? TrendingUp : kpi.trend === "down" ? TrendingDown : Minus;
          return (
            <div key={kpi.label} className={`rounded-2xl border bg-white dark:bg-zinc-900 p-4 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 transition-opacity ${loading ? "opacity-50" : ""}`}>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">{kpi.label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{kpi.value}</p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                kpi.good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}>
                <TrendIcon className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        {/* Tickets by Status */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tickets by Status</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Distribution of ticket statuses for the selected period</p>
              </div>
              <ExportMenu reportId="tickets-by-status" from={dateRange.from} to={dateRange.to} />
            </div>
            <div className="p-5 flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-72"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : statusChartData.length === 0 ? (
                <EmptyState label="ticket" />
              ) : (
                <BarChart
                  className="h-72 w-full"
                  data={statusChartData}
                  index="status"
                  categories={["Count"]}
                  colors={["fuchsia"]}
                  yAxisWidth={40}
                  showAnimation
                  showGridLines
                />
              )}
            </div>
          </div>
        </div>

        {/* Asset Distribution */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Asset Distribution</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current inventory by status</p>
              </div>
              <ExportMenu reportId="assets-by-status" from={dateRange.from} to={dateRange.to} />
            </div>
            <div className="p-5 flex-1 flex flex-col items-center justify-center">
              {loading ? (
                <div className="flex items-center justify-center h-56"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : assetDonutData.length === 0 ? (
                <EmptyState label="asset" />
              ) : (
                <>
                  <DonutChart
                    className="h-56 w-full"
                    data={assetDonutData}
                    category="value"
                    index="name"
                    colors={[...donutColors]}
                    valueFormatter={(n) => Intl.NumberFormat("us").format(n).toString()}
                    showAnimation
                  />
                  <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                    {assetDonutData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${donutBgColors[i % donutBgColors.length]}`} />
                        <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{item.name}</span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-white ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Resolution Time */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Resolution Time by Category</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Average hours to resolve by ticket type</p>
            </div>
            <ExportMenu reportId="tickets-by-resolution-time" from={dateRange.from} to={dateRange.to} />
          </div>
          <div className="p-5 flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : resTimeChartData.length === 0 ? (
              <EmptyState label="resolution" />
            ) : (
              <BarChart
                className="h-64 w-full"
                data={resTimeChartData}
                index="category"
                categories={["Avg Hours"]}
                colors={["fuchsia"]}
                yAxisWidth={50}
                showAnimation
                showGridLines
              />
            )}
          </div>
        </div>

        {/* User Activity */}
        <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">User Activity</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tickets created and resolved per user</p>
            </div>
            <ExportMenu reportId="user-activity" from={dateRange.from} to={dateRange.to} />
          </div>
          <div className="p-5 flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : activityChartData.length === 0 ? (
              <EmptyState label="activity" />
            ) : (
              <BarChart
                className="h-64 w-full"
                data={activityChartData}
                index="name"
                categories={["Resolved", "Created"]}
                colors={["cyan", "amber"]}
                yAxisWidth={40}
                showAnimation
                showGridLines
              />
            )}
          </div>
        </div>
      </div>

      {/* Ticket Trend (Area chart — all-time) */}
      <div className="rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm ring-1 ring-slate-200/50 dark:ring-white/10 flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-white/5">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Status Overview</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ticket counts across all statuses for the selected period</p>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : statusChartData.length === 0 ? (
            <EmptyState label="ticket" />
          ) : (
            <AreaChart
              className="h-48 w-full"
              data={statusChartData}
              index="status"
              categories={["Count"]}
              colors={["fuchsia"]}
              yAxisWidth={40}
              showAnimation
              showGridLines
              curveType="natural"
            />
          )}
        </div>
      </div>
    </div>
  );
}
