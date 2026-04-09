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
vi.mock('../db/client.js', () => ({
  db: { execute: vi.fn().mockResolvedValue([]) },
}))

describe('Notification service', () => {
  it('notifyTicketCreated returns without throwing', async () => {
    const { notifyTicketCreated } = await import('./notifications.service.js')
    await expect(
      notifyTicketCreated({ ticketId: 1, title: 'Test', createdById: 2 }),
    ).resolves.not.toThrow()
  })

  it('notifyTicketUpdated returns without throwing', async () => {
    const { notifyTicketUpdated } = await import('./notifications.service.js')
    await expect(
      notifyTicketUpdated({ ticketId: 1, updatedById: 2, changes: { status: 'resolved' } }),
    ).resolves.not.toThrow()
  })
})
