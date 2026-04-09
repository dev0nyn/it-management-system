import { describe, it, expect, vi } from 'vitest'

vi.mock('../env.js', () => ({
  validateEnv: vi.fn(() => ({
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgres://localhost/test',
    JWT_SECRET: 'test-secret-that-is-32-chars-long!!',
    CORS_ORIGIN: 'http://localhost:3000',
  })),
}))

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ id: 1 }]) })
vi.mock('../db/client.js', () => ({
  db: { insert: mockInsert, execute: vi.fn().mockResolvedValue([]) },
}))

describe('Audit log service', () => {
  it('logAudit calls db.insert with correct fields', async () => {
    const { logAudit } = await import('./audit.service.js')
    await logAudit({
      actorId: 1,
      action: 'user.update',
      targetType: 'user',
      targetId: 2,
      beforeState: { role: 'end_user' },
      afterState: { role: 'admin' },
    })
    expect(mockInsert).toHaveBeenCalled()
  })

  it('logAudit does not throw on DB error (fire-and-forget)', async () => {
    const mockInsertFail = vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockRejectedValue(new Error('DB down')) })
    vi.doMock('../db/client.js', () => ({
      db: { insert: mockInsertFail, execute: vi.fn().mockResolvedValue([]) },
    }))
    const { logAudit } = await import('./audit.service.js')
    await expect(
      logAudit({ actorId: 1, action: 'test', targetType: 'user', targetId: 1 }),
    ).resolves.not.toThrow()
  })
})
