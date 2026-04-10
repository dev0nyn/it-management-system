import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'
import * as AssetsService from '../../services/assets.service.js'

interface CreateAssetBody {
  tag: string
  type: string
  serialNumber?: string
  status?: 'in_stock' | 'assigned' | 'repair' | 'retired'
  purchaseDate?: Date
  warrantyExpiry?: Date
}

interface UpdateAssetBody {
  tag?: string
  type?: string
  serialNumber?: string
  status?: 'in_stock' | 'assigned' | 'repair' | 'retired'
  purchaseDate?: Date
  warrantyExpiry?: Date
}

export async function assetsRoute(app: FastifyInstance) {
  app.addHook('preHandler', requireRole('admin', 'it_staff'))

  app.get('/api/v1/assets', async () => AssetsService.listAssets())

  app.get('/api/v1/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const asset = await AssetsService.getAssetById(Number(id))
    if (!asset)
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } })
    return asset
  })

  app.post<{ Body: CreateAssetBody }>(
    '/api/v1/assets',
    {
      schema: {
        body: {
          type: 'object',
          required: ['tag', 'type'],
          properties: {
            tag: { type: 'string' },
            type: { type: 'string' },
            serialNumber: { type: 'string' },
            status: { type: 'string', enum: ['in_stock', 'assigned', 'repair', 'retired'] },
          },
        },
      },
    },
    async (request, reply) => {
      const asset = await AssetsService.createAsset(request.body)
      return reply.code(201).send(asset)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateAssetBody }>(
    '/api/v1/assets/:id',
    async (request, reply) => {
      const asset = await AssetsService.updateAsset(Number(request.params.id), request.body)
      if (!asset)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } })
      return asset
    },
  )

  app.delete('/api/v1/assets/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const deleted = await AssetsService.deleteAsset(Number(id))
    if (!deleted)
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Asset not found' } })
    return reply.code(204).send()
  })
}
