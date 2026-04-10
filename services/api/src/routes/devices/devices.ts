import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'
import * as DevicesService from '../../services/devices.service.js'

export async function devicesRoute(app: FastifyInstance) {
  // it_staff and admin can read
  app.get('/api/v1/devices', { preHandler: requireRole('admin', 'it_staff') }, async () => {
    return DevicesService.listDevices()
  })

  app.get(
    '/api/v1/devices/:id',
    { preHandler: requireRole('admin', 'it_staff') },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const device = await DevicesService.getDeviceById(Number(id))
      if (!device)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Device not found' } })
      return device
    },
  )

  // admin-only mutations
  app.post(
    '/api/v1/devices',
    {
      preHandler: requireRole('admin'),
      schema: {
        body: {
          type: 'object',
          required: ['hostOrIp', 'type'],
          properties: {
            hostOrIp: { type: 'string', minLength: 1 },
            type: { type: 'string', minLength: 1 },
            checkIntervalSec: { type: 'integer', minimum: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const device = await DevicesService.createDevice(
          request.body as { hostOrIp: string; type: string; checkIntervalSec?: number },
        )
        return reply.code(201).send(device)
      } catch (err: unknown) {
        if (err instanceof Error && (err as { code?: string }).code === 'CONFLICT') {
          return reply.code(409).send({ error: { code: 'CONFLICT', message: err.message } })
        }
        throw err
      }
    },
  )

  app.patch(
    '/api/v1/devices/:id',
    {
      preHandler: requireRole('admin'),
      schema: {
        body: {
          type: 'object',
          properties: {
            hostOrIp: { type: 'string', minLength: 1 },
            type: { type: 'string', minLength: 1 },
            checkIntervalSec: { type: 'integer', minimum: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const device = await DevicesService.updateDevice(
        Number(id),
        request.body as Partial<{ hostOrIp: string; type: string; checkIntervalSec: number }>,
      )
      if (!device)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Device not found' } })
      return device
    },
  )

  app.delete(
    '/api/v1/devices/:id',
    { preHandler: requireRole('admin') },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const device = await DevicesService.deleteDevice(Number(id))
      if (!device)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Device not found' } })
      return reply.code(204).send()
    },
  )
}
