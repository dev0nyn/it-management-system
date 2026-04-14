import { eq, ilike, and, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, assetAssignments, type NewAsset, type NewAssetAssignment } from "@/lib/db/schema/assets";
import { users } from "@/lib/db/schema/users";

const PAGE_SIZE = 20;

export async function findAll(page: number, search?: string, status?: string) {
  const offset = (page - 1) * PAGE_SIZE;

  const conditions: ReturnType<typeof eq>[] = [];
  if (search) {
    conditions.push(
      or(
        ilike(assets.tag, `%${search}%`),
        ilike(assets.name, `%${search}%`),
        ilike(assets.serial, `%${search}%`)
      )!
    );
  }
  if (status) {
    conditions.push(eq(assets.status, status as "in_stock" | "assigned" | "repair" | "retired"));
  }

  return db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      type: assets.type,
      serial: assets.serial,
      status: assets.status,
      assignedTo: assets.assignedTo,
      assignedToName: users.name,
      purchaseDate: assets.purchaseDate,
      warrantyExpiry: assets.warrantyExpiry,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedTo, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(PAGE_SIZE)
    .offset(offset);
}

export async function findAllAssignedTo(userId: string) {
  return db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      type: assets.type,
      serial: assets.serial,
      status: assets.status,
      assignedTo: assets.assignedTo,
      assignedToName: users.name,
      purchaseDate: assets.purchaseDate,
      warrantyExpiry: assets.warrantyExpiry,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedTo, users.id))
    .where(eq(assets.assignedTo, userId));
}

export async function findById(id: string) {
  const [asset] = await db
    .select({
      id: assets.id,
      tag: assets.tag,
      name: assets.name,
      type: assets.type,
      serial: assets.serial,
      status: assets.status,
      assignedTo: assets.assignedTo,
      assignedToName: users.name,
      purchaseDate: assets.purchaseDate,
      warrantyExpiry: assets.warrantyExpiry,
      createdAt: assets.createdAt,
      updatedAt: assets.updatedAt,
    })
    .from(assets)
    .leftJoin(users, eq(assets.assignedTo, users.id))
    .where(eq(assets.id, id));

  return asset ?? null;
}

export async function findByTag(tag: string) {
  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.tag, tag));

  return asset ?? null;
}

export async function create(data: NewAsset) {
  const [asset] = await db.insert(assets).values(data).returning();
  return asset;
}

export async function update(
  id: string,
  data: Partial<Pick<NewAsset, "tag" | "name" | "type" | "serial" | "status" | "purchaseDate" | "warrantyExpiry" | "assignedTo">>
) {
  const [asset] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, id))
    .returning();

  return asset ?? null;
}

export async function remove(id: string) {
  const [asset] = await db
    .delete(assets)
    .where(eq(assets.id, id))
    .returning({ id: assets.id });

  return asset ?? null;
}

export async function findAssignments(assetId: string) {
  return db
    .select({
      id: assetAssignments.id,
      userId: assetAssignments.userId,
      userName: users.name,
      userEmail: users.email,
      assignedAt: assetAssignments.assignedAt,
      unassignedAt: assetAssignments.unassignedAt,
    })
    .from(assetAssignments)
    .leftJoin(users, eq(assetAssignments.userId, users.id))
    .where(eq(assetAssignments.assetId, assetId))
    .orderBy(assetAssignments.assignedAt);
}

export async function findActiveAssignment(assetId: string) {
  const [row] = await db
    .select()
    .from(assetAssignments)
    .where(and(eq(assetAssignments.assetId, assetId), isNull(assetAssignments.unassignedAt)));

  return row ?? null;
}

export async function createAssignment(data: NewAssetAssignment) {
  const [row] = await db.insert(assetAssignments).values(data).returning();
  return row;
}

export async function closeAssignment(assetId: string) {
  await db
    .update(assetAssignments)
    .set({ unassignedAt: new Date() })
    .where(and(eq(assetAssignments.assetId, assetId), isNull(assetAssignments.unassignedAt)));
}
