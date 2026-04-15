import * as repo from "./repository";

export class AssetTagConflictError extends Error {}
export class AssetNotFoundError extends Error {}
export class AssetAlreadyAssignedError extends Error {}

export interface CreateAssetInput {
  tag: string;
  name: string;
  type: "laptop" | "monitor" | "phone" | "server" | "printer" | "network" | "peripheral";
  serial: string;
  status?: "in_stock" | "assigned" | "repair" | "retired";
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export interface UpdateAssetInput {
  tag?: string;
  name?: string;
  type?: "laptop" | "monitor" | "phone" | "server" | "printer" | "network" | "peripheral";
  serial?: string;
  status?: "in_stock" | "assigned" | "repair" | "retired";
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export async function listAssets(
  page: number,
  search?: string,
  status?: string,
  userId?: string
) {
  if (userId) {
    return repo.findAllAssignedTo(userId);
  }
  return repo.findAll(page, search, status);
}

export async function getAsset(id: string) {
  const asset = await repo.findById(id);
  if (!asset) throw new AssetNotFoundError(id);
  return asset;
}

export async function createAsset(input: CreateAssetInput) {
  const existing = await repo.findByTag(input.tag);
  if (existing) throw new AssetTagConflictError(input.tag);

  return repo.create({
    tag: input.tag,
    name: input.name,
    type: input.type,
    serial: input.serial,
    status: input.status ?? "in_stock",
    purchaseDate: input.purchaseDate ?? null,
    warrantyExpiry: input.warrantyExpiry ?? null,
  });
}

export async function updateAsset(id: string, input: UpdateAssetInput) {
  if (input.tag) {
    const existing = await repo.findByTag(input.tag);
    if (existing && existing.id !== id) throw new AssetTagConflictError(input.tag);
  }

  const asset = await repo.update(id, {
    ...(input.tag !== undefined && { tag: input.tag }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.type !== undefined && { type: input.type }),
    ...(input.serial !== undefined && { serial: input.serial }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.purchaseDate !== undefined && { purchaseDate: input.purchaseDate }),
    ...(input.warrantyExpiry !== undefined && { warrantyExpiry: input.warrantyExpiry }),
  });

  if (!asset) throw new AssetNotFoundError(id);
  return asset;
}

export async function deleteAsset(id: string) {
  const asset = await repo.remove(id);
  if (!asset) throw new AssetNotFoundError(id);
  return asset;
}

export async function assignAsset(assetId: string, userId: string, force = false) {
  const asset = await repo.findById(assetId);
  if (!asset) throw new AssetNotFoundError(assetId);

  const active = await repo.findActiveAssignment(assetId);
  if (active && !force) throw new AssetAlreadyAssignedError(assetId);

  // Close previous assignment if force-reassigning
  if (active) {
    await repo.closeAssignment(assetId);
  }

  await repo.createAssignment({ assetId, userId });
  return repo.update(assetId, { assignedTo: userId, status: "assigned" });
}

export async function unassignAsset(assetId: string) {
  const asset = await repo.findById(assetId);
  if (!asset) throw new AssetNotFoundError(assetId);

  await repo.closeAssignment(assetId);
  return repo.update(assetId, { assignedTo: null, status: "in_stock" });
}

export async function getAssignmentHistory(assetId: string) {
  const asset = await repo.findById(assetId);
  if (!asset) throw new AssetNotFoundError(assetId);
  return repo.findAssignments(assetId);
}
