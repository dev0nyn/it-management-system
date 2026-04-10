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

const STUB_DEVICE = {
  id: 1,
  hostOrIp: '192.168.1.1',
  type: 'server',
  checkIntervalSec: 60,
  status: 'unknown',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/devices', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + device list for admin', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      listDevices: vi.fn().mockResolvedValue([STUB_DEVICE]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('id')
  })

  it('returns 200 + device list for it_staff', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      listDevices: vi.fn().mockResolvedValue([STUB_DEVICE]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 403 for end_user', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 3, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/devices' })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/devices/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 for existing device (admin)', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      getDeviceById: vi.fn().mockResolvedValue(STUB_DEVICE),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('id', 1)
  })

  it('returns 404 for missing device', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      getDeviceById: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
    expect(JSON.parse(res.payload).error.code).toBe('NOT_FOUND')
  })
})

describe('POST /api/v1/devices', () => {
  beforeEach(() => vi.resetModules())

  it('returns 201 on successful creation (admin)', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      createDevice: vi.fn().mockResolvedValue(STUB_DEVICE),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { hostOrIp: '192.168.1.1', type: 'server' },
    })
    expect(res.statusCode).toBe(201)
    expect(JSON.parse(res.payload)).toHaveProperty('id')
  })

  it('returns 409 on duplicate hostOrIp', async () => {
    const conflictErr = Object.assign(new Error('Host/IP already registered'), {
      code: 'CONFLICT',
    })
    vi.doMock('../../services/devices.service.js', () => ({
      createDevice: vi.fn().mockRejectedValue(conflictErr),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { hostOrIp: '192.168.1.1', type: 'server' },
    })
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.payload).error.code).toBe('CONFLICT')
  })

  it('returns 400 on missing required fields', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { hostOrIp: '192.168.1.1' }, // missing type
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 403 for it_staff', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/devices',
      headers: { authorization: `Bearer ${token}` },
      payload: { hostOrIp: '192.168.1.2', type: 'switch' },
    })
    expect(res.statusCode).toBe(403)
  })
})

describe('PATCH /api/v1/devices/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 on successful update (admin)', async () => {
    const updated = { ...STUB_DEVICE, type: 'router' }
    vi.doMock('../../services/devices.service.js', () => ({
      updateDevice: vi.fn().mockResolvedValue(updated),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/devices/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'router' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('type', 'router')
  })

  it('returns 404 when device not found', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      updateDevice: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/devices/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { type: 'router' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/devices/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 204 on successful delete (admin)', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      deleteDevice: vi.fn().mockResolvedValue({ id: 1 }),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/devices/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when device not found', async () => {
    vi.doMock('../../services/devices.service.js', () => ({
      deleteDevice: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/devices/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 for it_staff', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/devices/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })
})
