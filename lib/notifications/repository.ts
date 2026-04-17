import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema/notifications";
import { eq, and, desc } from "drizzle-orm";

export async function createNotification(data: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const [row] = await db
    .insert(notifications)
    .values(data)
    .returning();
  return row;
}

export async function getNotificationsForUser(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string) {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows.length;
}

export async function markAsRead(id: string, userId: string) {
  const [row] = await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning();
  return row ?? null;
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}
