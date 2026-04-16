import { and, eq, gte, isNull, lte, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema/tickets";
import { assets } from "@/lib/db/schema/assets";
import { users } from "@/lib/db/schema/users";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export async function ticketsByStatus(range: DateRange = {}) {
  return db
    .select({
      status: tickets.status,
      count: count(),
    })
    .from(tickets)
    .where(
      and(
        range.from ? gte(tickets.createdAt, range.from) : undefined,
        range.to ? lte(tickets.createdAt, range.to) : undefined,
      )
    )
    .groupBy(tickets.status);
}

export async function ticketsByResolutionTime(range: DateRange = {}) {
  return db
    .select({
      category: tickets.category,
      avgHours: sql<number>`ROUND(AVG(EXTRACT(EPOCH FROM (${tickets.updatedAt} - ${tickets.createdAt})) / 3600)::numeric, 1)`,
    })
    .from(tickets)
    .where(
      and(
        sql`${tickets.status} IN ('resolved', 'closed')`,
        range.from ? gte(tickets.createdAt, range.from) : undefined,
        range.to ? lte(tickets.createdAt, range.to) : undefined,
      )
    )
    .groupBy(tickets.category)
    .orderBy(tickets.category);
}

export async function assetsByStatus() {
  return db
    .select({
      status: assets.status,
      count: count(),
    })
    .from(assets)
    .groupBy(assets.status);
}

export async function userActivity(range: DateRange = {}) {
  return db
    .select({
      name: users.name,
      created: sql<number>`COUNT(${tickets.id})`,
      resolved: sql<number>`COUNT(CASE WHEN ${tickets.status} IN ('resolved', 'closed') THEN 1 END)`,
    })
    .from(users)
    .leftJoin(
      tickets,
      and(
        eq(tickets.createdBy, users.id),
        range.from ? gte(tickets.createdAt, range.from) : undefined,
        range.to ? lte(tickets.createdAt, range.to) : undefined,
      )
    )
    .where(isNull(users.deletedAt))
    .groupBy(users.id, users.name)
    .orderBy(sql`COUNT(${tickets.id}) DESC`);
}
