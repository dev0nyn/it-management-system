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

const STUB_ASSET = {
  id: 1,
  tag: 'ASSET-001',
  type: 'laptop',
  serialNumber: 'SN123',
  status: 'available' as const,
  purchaseDate: null,
  warrantyExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/assets', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/assets' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 for end_user', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 + asset list for admin', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      listAssets: vi.fn().mockResolvedValue([STUB_ASSET]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
  })

  it('returns 200 for it_staff', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      listAssets: vi.fn().mockResolvedValue([]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('GET /api/v1/assets/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 for existing asset', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      getAssetById: vi.fn().mockResolvedValue(STUB_ASSET),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('tag', 'ASSET-001')
  })

  it('returns 404 for missing asset', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      getAssetById: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/assets/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/v1/assets', () => {
  beforeEach(() => vi.resetModules())

  it('returns 201 + created asset', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      createAsset: vi.fn().mockResolvedValue(STUB_ASSET),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
      payload: { tag: 'ASSET-001', type: 'laptop' },
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.payload)).toHaveProperty('tag', 'ASSET-001')
  })

  it('returns 400 on missing required fields', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'laptop' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid status value', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/assets',
      headers: { authorization: `Bearer ${token}` },
      payload: { tag: 'X', type: 'laptop', status: 'broken' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/v1/assets/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 on successful update', async () => {
    const updated = { ...STUB_ASSET, status: 'maintenance' as const }
    vi.doMock('../../services/assets.service.js', () => ({
      updateAsset: vi.fn().mockResolvedValue(updated),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/assets/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'maintenance' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('status', 'maintenance')
  })

  it('returns 404 when asset not found', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      updateAsset: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/assets/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'retired' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/assets/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 204 on successful delete', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      deleteAsset: vi.fn().mockResolvedValue({ id: 1 }),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/assets/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when asset not found', async () => {
    vi.doMock('../../services/assets.service.js', () => ({
      deleteAsset: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/assets/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
