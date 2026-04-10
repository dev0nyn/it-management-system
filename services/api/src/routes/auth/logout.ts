import type { FastifyInstance, FastifyRequest } from 'fastify'
import { requireRole } from '../../auth/index.js'
import { denyToken } from '../../auth/denylist.js'
import { logAudit } from '../../services/audit.service.js'
import type { JwtPayload } from '../../auth/jwt.js'

export async function logoutRoute(app: FastifyInstance) {
  app.post(
    '/api/v1/auth/logout',
    { preHandler: requireRole('admin', 'it_staff', 'end_user') },
    async (request, reply) => {
      const user = (request as FastifyRequest & { user: JwtPayload }).user
      const rawToken = request.headers.authorization!.slice(7)

      denyToken(rawToken)

      await logAudit({
        actorId: user.userId,
        action: 'logout',
        targetType: 'user',
        targetId: user.userId,
      })

      return reply.code(200).send({ message: 'Logged out successfully' })
    },
  )
}
