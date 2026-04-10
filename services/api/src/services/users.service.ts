import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { db } from '../db/index.js'
import { users } from '../db/index.js'
import type { Role } from '../auth/index.js'

export async function listUsers() {
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
}

export async function getUserById(id: number) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
  return user ?? null
}

export async function createUser(data: { email: string; password: string; role: Role }) {
  const passwordHash = await bcrypt.hash(data.password, 12)
  const [user] = await db
    .insert(users)
    .values({ email: data.email, passwordHash, role: data.role })
    .returning({ id: users.id, email: users.email, role: users.role })
  return user
}

export async function updateUser(
  id: number,
  data: Partial<{ email: string; role: Role; isActive: boolean }>,
) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    })
  return user ?? null
}

export async function deactivateUser(id: number) {
  return updateUser(id, { isActive: false })
}
