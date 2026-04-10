import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'
import type { Role } from '../../auth/index.js'
import * as UsersService from '../../services/users.service.js'

interface CreateUserBody {
  email: string
  password: string
  role: Role
}

interface UpdateUserBody {
  email?: string
  role?: Role
  isActive?: boolean
}

export async function usersRoute(app: FastifyInstance) {
  // All users routes are admin-only
  app.addHook('preHandler', requireRole('admin'))

  app.get('/api/v1/users', async (request) => {
    const { page, limit } = request.query as { page?: string; limit?: string }
    return UsersService.listUsers(page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20)
  })

  app.get('/api/v1/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await UsersService.getUserById(Number(id))
    if (!user)
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    return user
  })

  app.post<{ Body: CreateUserBody }>(
    '/api/v1/users',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: ['admin', 'it_staff', 'end_user'] },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await UsersService.createUser(request.body)
        return reply.code(201).send(user)
      } catch (err: unknown) {
        if (err instanceof Error && (err as { code?: string }).code === 'CONFLICT') {
          return reply.code(409).send({ error: { code: 'CONFLICT', message: err.message } })
        }
        throw err
      }
    },
  )

  app.patch<{ Params: { id: string }; Body: UpdateUserBody }>(
    '/api/v1/users/:id',
    async (request, reply) => {
      const user = await UsersService.updateUser(Number(request.params.id), request.body)
      if (!user)
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
      return user
    },
  )

  app.delete('/api/v1/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await UsersService.deactivateUser(Number(id))
    if (!user)
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    return reply.code(204).send()
  })
}
