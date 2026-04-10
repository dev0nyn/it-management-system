import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { devices } from '../db/index.js'

export async function listDevices() {
  return db.select().from(devices)
}

export async function getDeviceById(id: number) {
  const [device] = await db.select().from(devices).where(eq(devices.id, id))
  return device ?? null
}

export async function createDevice(data: {
  hostOrIp: string
  type: string
  checkIntervalSec?: number
}) {
  try {
    const [device] = await db.insert(devices).values(data).returning()
    return device
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === '23505') {
      throw Object.assign(new Error('Host/IP already registered'), {
        code: 'CONFLICT',
        statusCode: 409,
      })
    }
    throw err
  }
}

export async function updateDevice(
  id: number,
  data: Partial<{ hostOrIp: string; type: string; checkIntervalSec: number }>,
) {
  const [device] = await db
    .update(devices)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(devices.id, id))
    .returning()
  return device ?? null
}

export async function deleteDevice(id: number) {
  const [device] = await db.delete(devices).where(eq(devices.id, id)).returning({ id: devices.id })
  return device ?? null
}
