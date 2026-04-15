import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tickets, type NewTicket } from "@/lib/db/schema/tickets";
import { users } from "@/lib/db/schema/users";

export async function create(data: NewTicket) {
  const [ticket] = await db.insert(tickets).values(data).returning();
  return ticket;
}

export async function findItStaffUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, "it_staff"));
}
