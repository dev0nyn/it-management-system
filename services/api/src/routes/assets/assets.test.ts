import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../env.js', () => ({
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'test-secret-that-is-32-chars-long!!',
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))
vi.mock('../../db/client.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}))

describe('Assets API', () => {
  beforeEach(() => vi.resetModules())

  it('GET /api/v1/assets returns 401 without token', async () => {
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/assets' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/v1/assets returns 403 for end_user', async () => {
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('POST /api/v1/assets returns 400 on missing tag', async () => {
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'laptop' },
    })
    expect(res.statusCode).toBe(400)
  })
})
