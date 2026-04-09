import { db } from '../db/index.js'
import { auditLog } from '../db/index.js'

interface AuditEntry {
  actorId: number
  action: string
  targetType: string
  targetId: number
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      beforeState: entry.beforeState ?? null,
      afterState: entry.afterState ?? null,
    })
  } catch (err) {
    // Fire-and-forget — audit failures must never break the main flow
    console.error('[audit] Failed to write audit log:', err)
  }
}
