import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/index.js'
import { signToken, type Role } from '../../auth/index.js'

export async function loginRoute(app: FastifyInstance) {
  app.post(
    '/api/v1/auth/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string }

      const [user] = await db.select().from(users).where(eq(users.email, email))

      const INVALID = 'Invalid username or password'

      if (!user || !user.isActive) {
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: INVALID } })
      }

      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: INVALID } })
      }

      const token = signToken({ userId: user.id, role: user.role as Role })
      return { token, user: { id: user.id, email: user.email, role: user.role } }
    },
  )
}
