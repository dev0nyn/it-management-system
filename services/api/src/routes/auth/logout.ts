import type { FastifyInstance } from 'fastify'
import { requireRole } from '../../auth/index.js'

export async function logoutRoute(app: FastifyInstance) {
  app.post(
    '/api/v1/auth/logout',
    { preHandler: requireRole('admin', 'it_staff', 'end_user') },
    async (_request, reply) => {
      // JWT is stateless — client discards token
      return reply.code(200).send({ message: 'Logged out successfully' })
    },
  )
}
