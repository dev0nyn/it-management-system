import { eq, ilike, isNull, or, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, type NewUser } from "@/lib/db/schema/users";

const PAGE_SIZE = 20;

export async function findAll(page: number, search?: string) {
  const offset = (page - 1) * PAGE_SIZE;

  const conditions = [isNull(users.deletedAt)];
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      )!
    );
  }

  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(...conditions))
    .limit(PAGE_SIZE)
    .offset(offset);
}

export async function findById(id: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)));

  return user ?? null;
}

export async function findByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  return user ?? null;
}

export async function create(data: NewUser) {
  const [user] = await db
    .insert(users)
    .values(data)
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return user;
}

export async function update(
  id: string,
  data: Partial<Pick<NewUser, "name" | "email" | "role">>
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return user ?? null;
}

export async function softDelete(id: string) {
  const [user] = await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .returning({ id: users.id });

  return user ?? null;
}
