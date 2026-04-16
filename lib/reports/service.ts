import * as repo from "./repository";
import type { DateRange } from "./repository";

export interface ReportResult {
  columns: string[];
  rows: Record<string, unknown>[];
  generatedAt: string;
}

export const REPORT_DEFINITIONS = [
  {
    id: "tickets-by-status",
    title: "Tickets by Status",
    description: "Count of tickets grouped by current status",
  },
  {
    id: "tickets-by-resolution-time",
    title: "Resolution Time by Category",
    description: "Average hours to resolve tickets, grouped by category",
  },
  {
    id: "assets-by-status",
    title: "Assets by Status",
    description: "Current asset inventory counts by status",
  },
  {
    id: "user-activity",
    title: "User Activity",
    description: "Tickets created and resolved per user",
  },
] as const;

export type ReportId = (typeof REPORT_DEFINITIONS)[number]["id"];

export const REPORT_IDS = REPORT_DEFINITIONS.map((r) => r.id);

export async function getTicketsByStatus(range?: DateRange): Promise<ReportResult> {
  const rows = await repo.ticketsByStatus(range);
  return {
    columns: ["status", "count"],
    rows: rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getTicketsByResolutionTime(range?: DateRange): Promise<ReportResult> {
  const rows = await repo.ticketsByResolutionTime(range);
  return {
    columns: ["category", "avgHours"],
    rows: rows.map((r) => ({ category: r.category, avgHours: Number(r.avgHours) })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getAssetsByStatus(): Promise<ReportResult> {
  const rows = await repo.assetsByStatus();
  return {
    columns: ["status", "count"],
    rows: rows.map((r) => ({ status: r.status, count: Number(r.count) })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getUserActivity(range?: DateRange): Promise<ReportResult> {
  const rows = await repo.userActivity(range);
  return {
    columns: ["name", "created", "resolved"],
    rows: rows.map((r) => ({
      name: r.name,
      created: Number(r.created),
      resolved: Number(r.resolved),
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function getReport(id: ReportId, range?: DateRange): Promise<ReportResult> {
  switch (id) {
    case "tickets-by-status":
      return getTicketsByStatus(range);
    case "tickets-by-resolution-time":
      return getTicketsByResolutionTime(range);
    case "assets-by-status":
      return getAssetsByStatus();
    case "user-activity":
      return getUserActivity(range);
  }
}
