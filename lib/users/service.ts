import argon2 from "argon2";
import * as repo from "./repository";

export class UserNotFoundError extends Error {}
export class EmailConflictError extends Error {}

export async function listUsers(page: number, search?: string) {
  return repo.findAll(page, search);
}

export async function getUser(id: string) {
  const user = await repo.findById(id);
  if (!user) throw new UserNotFoundError(`User ${id} not found`);
  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "it_staff" | "end_user";
}) {
  const existing = await repo.findByEmail(data.email);
  if (existing) throw new EmailConflictError(`Email already in use`);

  const passwordHash = await argon2.hash(data.password);
  return repo.create({ ...data, passwordHash });
}

export async function updateUser(
  id: string,
  data: Partial<{ name: string; email: string; role: "admin" | "it_staff" | "end_user" }>
) {
  if (data.email) {
    const existing = await repo.findByEmail(data.email);
    if (existing && existing.id !== id) throw new EmailConflictError(`Email already in use`);
  }

  const user = await repo.update(id, data);
  if (!user) throw new UserNotFoundError(`User ${id} not found`);
  return user;
}

export async function deleteUser(id: string) {
  const user = await repo.softDelete(id);
  if (!user) throw new UserNotFoundError(`User ${id} not found`);
}
