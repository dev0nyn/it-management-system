import { describe, it, expect, vi } from 'vitest'

vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    options: { parsers: {}, serializers: {} },
  })),
}))

vi.mock('../env.js', () => ({
  validateEnv: vi.fn(() => ({
    DATABASE_URL: 'postgres://localhost/test',
    NODE_ENV: 'test',
    PORT: 3001,
    JWT_SECRET: 'a'.repeat(32),
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))

describe('db client', () => {
  it('exports a db object', async () => {
    const { db } = await import('./client.js')
    expect(db).toBeDefined()
  })
})
