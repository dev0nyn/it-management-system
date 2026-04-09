import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'
import * as AssignmentsService from '../../services/asset-assignments.service.js'

export async function assetAssignmentsRoute(app: FastifyInstance) {
  app.addHook('preHandler', requireRole('admin', 'it_staff'))

  app.post('/api/v1/assets/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { userId, notes } = request.body as { userId: number; notes?: string }
    const assignment = await AssignmentsService.assignAsset(Number(id), userId, notes)
    return reply.code(201).send(assignment)
  })

  app.post('/api/v1/assets/:id/unassign', async (request) => {
    const { id } = request.params as { id: string }
    return AssignmentsService.unassignAsset(Number(id))
  })

  app.get('/api/v1/assets/:id/assignments', async (request) => {
    const { id } = request.params as { id: string }
    return AssignmentsService.getAssetAssignments(Number(id))
  })
}
