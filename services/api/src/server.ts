import Fastify, { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { validateEnv } from './env.js'

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
