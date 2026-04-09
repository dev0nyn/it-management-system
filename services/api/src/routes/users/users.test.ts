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

const STUB_USER = {
  id: 1,
  email: 'user@test.local',
  role: 'end_user',
  isActive: true,
  createdAt: new Date(),
}

describe('GET /api/v1/users', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/users' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 403 for end_user role', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 + user list for admin', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      listUsers: vi.fn().mockResolvedValue([STUB_USER]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('id')
    expect(body[0]).not.toHaveProperty('passwordHash')
  })
})

describe('GET /api/v1/users/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 for existing user (admin)', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      getUserById: vi.fn().mockResolvedValue(STUB_USER),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('id', 1)
  })

  it('returns 404 for missing user', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      getUserById: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /api/v1/users', () => {
  beforeEach(() => vi.resetModules())

  it('returns 201 + created user (no passwordHash in response)', async () => {
    const created = { id: 2, email: 'new@test.local', role: 'end_user' }
    vi.doMock('../../services/users.service.js', () => ({
      createUser: vi.fn().mockResolvedValue(created),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'new@test.local', password: 'SecurePass1!', role: 'end_user' },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('id')
    expect(body).not.toHaveProperty('passwordHash')
  })

  it('returns 400 on missing email', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { password: 'SecurePass1!', role: 'end_user' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 on invalid role', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'x@test.local', password: 'SecurePass1!', role: 'superuser' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/v1/users/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 on successful update', async () => {
    const updated = { ...STUB_USER, role: 'it_staff' }
    vi.doMock('../../services/users.service.js', () => ({
      updateUser: vi.fn().mockResolvedValue(updated),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'it_staff' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('role', 'it_staff')
  })

  it('returns 404 when user not found', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      updateUser: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'it_staff' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/v1/users/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 204 on successful deactivation', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      deactivateUser: vi.fn().mockResolvedValue({ ...STUB_USER, isActive: false }),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/2',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(204)
  })

  it('returns 404 when user not found', async () => {
    vi.doMock('../../services/users.service.js', () => ({
      deactivateUser: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/users/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })
})
