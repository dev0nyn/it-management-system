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

const STUB_ASSIGNMENT = { id: 1, assetId: 1, userId: 2, assignedAt: new Date(), returnedAt: null }

describe('POST /api/v1/assets/:id/assign', () => {
  beforeEach(() => vi.resetModules())

  it('returns 201 + assignment for admin', async () => {
    vi.doMock('../../services/asset-assignments.service.js', () => ({
      assignAsset: vi.fn().mockResolvedValue(STUB_ASSIGNMENT),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/1/assign',
      headers: { authorization: `Bearer ${token}` },
      payload: { userId: 2 },
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.payload)).toHaveProperty('assetId', 1)
  })

  it('returns 403 for end_user', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 3, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/1/assign',
      headers: { authorization: `Bearer ${token}` },
      payload: { userId: 3 },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/1/assign',
      payload: { userId: 2 },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /api/v1/assets/:id/unassign', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + returnedAt for admin', async () => {
    const now = new Date()
    vi.doMock('../../services/asset-assignments.service.js', () => ({
      unassignAsset: vi.fn().mockResolvedValue({ assetId: 1, returnedAt: now }),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets/1/unassign',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('assetId', 1)
  })
})

describe('GET /api/v1/assets/:id/assignments', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + assignments list for admin', async () => {
    vi.doMock('../../services/asset-assignments.service.js', () => ({
      getAssetAssignments: vi.fn().mockResolvedValue([STUB_ASSIGNMENT]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/1/assignments',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
  })
})
