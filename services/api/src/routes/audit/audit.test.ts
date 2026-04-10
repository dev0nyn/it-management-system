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
  db: {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn(),
  },
}))

const STUB_LOG = {
  id: 1,
  userId: 1,
  action: 'user.create',
  entityType: 'user',
  entityId: 2,
  metadata: null,
  createdAt: new Date(),
}

describe('GET /api/v1/audit', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/audit' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 for it_staff', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 403 for end_user', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 3, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 + log entries for admin', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([STUB_LOG]),
    })
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]), select: mockSelect },
    }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/audit',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(Array.isArray(body)).toBe(true)
  })
})
