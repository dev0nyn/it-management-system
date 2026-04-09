import { describe, it, expect, vi } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'

vi.mock('../env.js', () => ({
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'test-secret-that-is-32-chars-long!!',
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))

describe('JWT helpers', () => {
  it('signToken returns a string', async () => {
    const { signToken } = await import('./jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)
  })

  it('verifyToken returns payload for valid token', async () => {
    const { signToken, verifyToken } = await import('./jwt.js')
    const token = signToken({ userId: 42, role: 'it_staff' })
    const payload = verifyToken(token)
    expect(payload.userId).toBe(42)
    expect(payload.role).toBe('it_staff')
  })

  it('verifyToken throws for invalid token', async () => {
    const { verifyToken } = await import('./jwt.js')
    expect(() => verifyToken('invalid.token.here')).toThrow()
  })

  it('verifyToken throws for expired token', async () => {
    const { signToken, verifyToken } = await import('./jwt.js')
    const token = signToken({ userId: 1, role: 'admin' }, '-1s')
    expect(() => verifyToken(token)).toThrow()
  })
})

describe('RBAC middleware', () => {
  it('allows request when role matches', async () => {
    const { requireRole } = await import('./middleware.js')
    const { signToken } = await import('./jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })

    const mockRequest = {
      headers: { authorization: `Bearer ${token}` },
      user: null,
    }
    const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }

    // Should not throw
    await expect(
      requireRole('admin')(
        mockRequest as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      ),
    ).resolves.toBeUndefined()
  })

  it('returns 401 when no token provided', async () => {
    const { requireRole } = await import('./middleware.js')
    const mockRequest = { headers: {}, user: null }
    const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }

    await requireRole('admin')(
      mockRequest as unknown as FastifyRequest,
      mockReply as unknown as FastifyReply,
    )
    expect(mockReply.code).toHaveBeenCalledWith(401)
  })

  it('returns 403 when role is insufficient', async () => {
    const { requireRole } = await import('./middleware.js')
    const { signToken } = await import('./jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })

    const mockRequest = {
      headers: { authorization: `Bearer ${token}` },
      user: null,
    }
    const mockReply = { code: vi.fn().mockReturnThis(), send: vi.fn() }

    await requireRole('admin')(
      mockRequest as unknown as FastifyRequest,
      mockReply as unknown as FastifyReply,
    )
    expect(mockReply.code).toHaveBeenCalledWith(403)
  })
})
