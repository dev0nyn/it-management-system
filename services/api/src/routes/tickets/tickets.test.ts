import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../env.js', () => ({
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'test', PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'test-secret-that-is-32-chars-long!!',
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))
vi.mock('../../db/client.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}))

describe('Tickets API', () => {
  beforeEach(() => vi.resetModules())

  it('POST /api/v1/tickets returns 401 without token', async () => {
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'POST', url: '/api/v1/tickets', payload: { title: 'test' } })
    expect(res.statusCode).toBe(401)
  })

  it('POST /api/v1/tickets returns 400 on missing title', async () => {
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'no title' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /api/v1/tickets returns 401 without token', async () => {
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/tickets' })
    expect(res.statusCode).toBe(401)
  })
})
