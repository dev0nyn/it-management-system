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

const ADMIN_USER = {
  id: 1,
  email: 'admin@test.local',
  role: 'admin' as const,
  isActive: true,
}

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + token for valid credentials', async () => {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('ValidPass1!', 10)

    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ ...ADMIN_USER, passwordHash: hash }]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ADMIN_USER.email, password: 'ValidPass1!' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('token')
    expect(typeof body.token).toBe('string')
  })

  it('returns 401 for wrong password', async () => {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('correct-pass', 10)

    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ ...ADMIN_USER, passwordHash: hash }]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ADMIN_USER.email, password: 'wrong-pass' },
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.payload).error.message).toBe('Invalid username or password')
  })

  it('returns 401 for unknown email (no user enumeration)', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'nobody@test.local', password: 'anything' },
    })

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.payload).error.message).toBe('Invalid username or password')
  })

  it('returns 401 for inactive user', async () => {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('ValidPass1!', 10)

    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockResolvedValue([{ ...ADMIN_USER, isActive: false, passwordHash: hash }]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ADMIN_USER.email, password: 'ValidPass1!' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 400 for missing email', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { password: 'ValidPass1!' },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 with valid token', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))

    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('message')
  })

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({
      db: { execute: vi.fn().mockResolvedValue([]) },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' })

    expect(res.statusCode).toBe(401)
  })
})
