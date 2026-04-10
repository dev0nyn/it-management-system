import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env at the top level so server.ts can import it
vi.mock('../env.js', () => ({
  validateEnv: vi.fn(() => ({
    DATABASE_URL: 'postgres://localhost/test',
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))

// Provide a controllable db mock
const mockExecute = vi.fn()
vi.mock('../db/client.js', () => ({
  db: { execute: mockExecute },
}))

describe('/readyz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 503 when DB is unreachable', async () => {
    mockExecute.mockRejectedValue(new Error('connection refused'))
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/readyz' })
    expect(res.statusCode).toBe(503)
  })

  it('returns 200 when DB is reachable', async () => {
    mockExecute.mockResolvedValue([{ '?column?': 1 }])
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/readyz' })
    expect(res.statusCode).toBe(200)
  })
})
