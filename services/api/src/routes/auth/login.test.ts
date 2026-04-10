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
  db: { execute: vi.fn().mockResolvedValue([]), select: vi.fn() },
}))

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + token on valid credentials', async () => {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('Password123!', 10)

    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 1,
                email: 'admin@example.com',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
              },
            ]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@example.com', password: 'Password123!' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('token')
  })

  it('returns 401 on wrong password', async () => {
    const bcrypt = await import('bcrypt')
    const hash = await bcrypt.hash('correct', 10)

    vi.doMock('../../db/client.js', () => ({
      db: {
        execute: vi.fn().mockResolvedValue([]),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 1,
                email: 'admin@example.com',
                passwordHash: hash,
                role: 'admin',
                isActive: true,
              },
            ]),
          }),
        }),
      },
    }))

    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@example.com', password: 'wrong' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 on unknown email (no user enumeration)', async () => {
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
      payload: { email: 'nobody@example.com', password: 'anything' },
    })
    expect(res.statusCode).toBe(401)
    // same message regardless of whether user exists
    expect(JSON.parse(res.payload).error.message).toBe('Invalid username or password')
  })
})
