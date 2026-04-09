import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assets } from '../db/index.js'

export async function listAssets() {
  return db.select().from(assets)
}

export async function getAssetById(id: number) {
  const [asset] = await db.select().from(assets).where(eq(assets.id, id))
  return asset ?? null
}

export async function createAsset(data: {
  tag: string
  type: string
  serialNumber?: string
  status?: 'available' | 'assigned' | 'maintenance' | 'retired'
  purchaseDate?: Date
  warrantyExpiry?: Date
}) {
  const [asset] = await db.insert(assets).values(data).returning()
  return asset
}

export async function updateAsset(
  id: number,
  data: Partial<{
    tag: string
    type: string
    serialNumber: string
    status: 'available' | 'assigned' | 'maintenance' | 'retired'
    purchaseDate: Date
    warrantyExpiry: Date
  }>,
) {
  const [asset] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() } as Parameters<ReturnType<typeof db.update>['set']>[0])
    .where(eq(assets.id, id))
    .returning()
  return asset ?? null
}

export async function deleteAsset(id: number) {
  const [asset] = await db.delete(assets).where(eq(assets.id, id)).returning({ id: assets.id })
  return asset ?? null
}
