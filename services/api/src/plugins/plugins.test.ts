import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env so tests don't need real env vars
vi.mock('../env.js', () => ({
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))

// Mock db client so /readyz doesn't try to connect
vi.mock('../db/client.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}))

describe('API server plugins', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('responds to /healthz with 200', async () => {
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.statusCode).toBe(200)
  })

  it('returns CORS header on OPTIONS request', async () => {
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/healthz',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'GET' },
    })
    expect(res.headers['access-control-allow-origin']).toBeDefined()
  })

  it('returns error envelope shape on 404', async () => {
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/not-found' })
    const body = JSON.parse(res.payload)
    expect(body).toHaveProperty('error')
    expect(body.error).toHaveProperty('code')
    expect(body.error).toHaveProperty('message')
  })

  it('includes security headers from helmet', async () => {
    const { buildServer } = await import('../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/healthz' })
    expect(res.headers['x-content-type-options']).toBeDefined()
  })
})
