import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken, type Role, type JwtPayload } from './jwt.js'
import { isTokenDenied } from './denylist.js'

export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
      })
      return
    }

    const token = authHeader.slice(7)

    if (isTokenDenied(token)) {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Token has been revoked' },
      })
      return
    }

    let payload
    try {
      payload = verifyToken(token)
    } catch {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      })
      return
    }

    if (!allowedRoles.includes(payload.role)) {
      reply.code(403).send({
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      })
      return
    }

    // Attach user to request for downstream handlers
    ;(request as FastifyRequest & { user: JwtPayload }).user = payload
  }
}
