import type { FastifyInstance, FastifyRequest } from 'fastify'
import { requireRole } from '../../auth/index.js'
import type { JwtPayload } from '../../auth/index.js'
import * as TicketsService from '../../services/tickets.service.js'

type AuthenticatedRequest = FastifyRequest & { user: JwtPayload }

interface CreateTicketBody {
  title: string
  description?: string
  priority?: string
  category?: string
  assetId?: number
}

interface UpdateTicketBody {
  title?: string
  description?: string
  status?: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority?: string
  assignedToId?: number
}

export async function ticketsRoute(app: FastifyInstance) {
  // All ticket routes require authentication (any role)
  app.addHook('preHandler', requireRole('admin', 'it_staff', 'end_user'))

  app.get('/api/v1/tickets', async (request) => {
    const { user } = request as AuthenticatedRequest
    return TicketsService.listTickets(user.role, user.userId)
  })

  app.get('/api/v1/tickets/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const ticket = await TicketsService.getTicketById(Number(id))
    if (!ticket)
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } })
    return ticket
  })

  app.get('/api/v1/tickets/:id/events', async (request) => {
    const { id } = request.params as { id: string }
    return TicketsService.getTicketEvents(Number(id))
  })

  app.post<{ Body: CreateTicketBody }>(
    '/api/v1/tickets',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            category: { type: 'string' },
            assetId: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest & { body: CreateTicketBody }
      const ticket = await TicketsService.createTicket({
        ...request.body,
        createdById: user.userId,
      })
      return reply.code(201).send(ticket)
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateTicketBody }>(
    '/api/v1/tickets/:id',
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest
      const ticket = await TicketsService.updateTicket(
        Number(request.params.id),
        user.userId,
        request.body,
      )
      if (!ticket)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Ticket not found' } })
      return ticket
    },
  )
}
