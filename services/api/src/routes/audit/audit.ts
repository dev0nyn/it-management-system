import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'
import { db } from '../../db/index.js'
import { auditLog } from '../../db/index.js'

export async function auditRoute(app: FastifyInstance) {
  app.get(
    '/api/v1/audit',
    {
      preHandler: requireRole('admin'),
    },
    async () => {
      return db.select().from(auditLog)
    },
  )
}
