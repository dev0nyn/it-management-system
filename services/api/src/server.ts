import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import helmet from '@fastify/helmet'
import { sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { validateEnv } from './env.js'
import { assetsRoute } from './routes/assets/assets.js'
import { assetAssignmentsRoute } from './routes/assets/assignments.js'
import { ticketsRoute } from './routes/tickets/tickets.js'
import { auditRoute } from './routes/audit/audit.js'
import { loginRoute } from './routes/auth/login.js'
import { logoutRoute } from './routes/auth/logout.js'

export async function buildServer(): Promise<FastifyInstance> {
  const env = validateEnv()

  const server = Fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
    genReqId: () => uuidv4(),
  })

  // Security headers
  await server.register(helmet, { global: true })

  // CORS
  await server.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Rate limiting — 100 req/min per IP globally
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  // Global error handler — { error: { code, message } } envelope
  server.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: error.message ?? 'An unexpected error occurred',
      },
    })
  })

  // Override default 404
  server.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    })
  })

  // Request latency tracking
  server.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      {
        url: request.url,
        method: request.method,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
      },
      'Request completed',
    )
    done()
  })

  await server.register(loginRoute)
  await server.register(logoutRoute)
  await server.register(assetsRoute)
  await server.register(assetAssignmentsRoute)
  await server.register(ticketsRoute)
  await server.register(auditRoute)

  server.get('/healthz', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  server.get('/readyz', async (_req, reply) => {
    try {
      const { db } = await import('./db/client.js')
      await db.execute(sql`SELECT 1`)
      return { status: 'ok', timestamp: new Date().toISOString() }
    } catch {
      return reply.code(503).send({ status: 'error', message: 'Database unavailable' })
    }
  })

  return server
}

// Start server when run directly (not imported as a module)
const start = async () => {
  const env = validateEnv()
  const server = await buildServer()
  try {
    await server.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

// Only auto-start when executed directly, not when imported in tests
if (require.main === module) {
  start()
}
