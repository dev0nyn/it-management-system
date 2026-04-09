import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assetAssignments, assets } from '../db/index.js'

export async function assignAsset(assetId: number, userId: number, notes?: string) {
  // Mark asset as assigned
  await db
    .update(assets)
    .set({ status: 'assigned', updatedAt: new Date() })
    .where(eq(assets.id, assetId))
  const [assignment] = await db
    .insert(assetAssignments)
    .values({ assetId, userId, notes })
    .returning()
  return assignment
}

export async function unassignAsset(assetId: number) {
  const now = new Date()
  await db
    .update(assetAssignments)
    .set({ returnedAt: now })
    .where(eq(assetAssignments.assetId, assetId))
  await db.update(assets).set({ status: 'available', updatedAt: now }).where(eq(assets.id, assetId))
  return { assetId, returnedAt: now }
}

export async function getAssetAssignments(assetId: number) {
  return db.select().from(assetAssignments).where(eq(assetAssignments.assetId, assetId))
}
