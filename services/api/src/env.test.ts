import { describe, it, expect } from 'vitest'
import { validateEnv } from './env.js'

describe('validateEnv', () => {
  it('throws on missing JWT_SECRET', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT: '3001',
        DATABASE_URL: 'postgres://localhost/test',
        CORS_ORIGIN: 'http://localhost:3000',
      }),
    ).toThrow(/JWT_SECRET/)
  })

  it('throws on missing DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'development',
        PORT: '3001',
        JWT_SECRET: 'a'.repeat(32),
        CORS_ORIGIN: 'http://localhost:3000',
      }),
    ).toThrow(/DATABASE_URL/)
  })

  it('returns parsed env with PORT as number on valid input', () => {
    const result = validateEnv({
      NODE_ENV: 'development',
      PORT: '3001',
      DATABASE_URL: 'postgres://localhost/test',
      JWT_SECRET: 'a'.repeat(32),
      CORS_ORIGIN: 'http://localhost:3000',
    })
    expect(result.PORT).toBe(3001)
    expect(typeof result.PORT).toBe('number')
  })
})
