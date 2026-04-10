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

const STUB_TICKET = {
  id: 1,
  title: 'Screen broken',
  description: 'LCD cracked',
  status: 'open' as const,
  priority: 'high',
  category: null,
  assetId: null,
  createdById: 2,
  assignedToId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const STUB_EVENT = {
  id: 1,
  ticketId: 1,
  actorId: 1,
  eventType: 'status_changed',
  oldValue: 'open',
  newValue: 'in_progress',
  createdAt: new Date(),
}

describe('GET /api/v1/tickets', () => {
  beforeEach(() => vi.resetModules())

  it('returns 401 without token', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/v1/tickets' })
    expect(res.statusCode).toBe(401)
  })

  it('admin sees all tickets', async () => {
    const adminTickets = [STUB_TICKET, { ...STUB_TICKET, id: 2, createdById: 3 }]
    vi.doMock('../../services/tickets.service.js', () => ({
      listTickets: vi.fn().mockResolvedValue(adminTickets),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.length).toBe(2)
  })

  it('end_user sees only own tickets (service called with role + userId)', async () => {
    const listTickets = vi.fn().mockResolvedValue([STUB_TICKET])
    vi.doMock('../../services/tickets.service.js', () => ({ listTickets }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(listTickets).toHaveBeenCalledWith('end_user', 2)
  })
})

describe('GET /api/v1/tickets/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 for existing ticket', async () => {
    vi.doMock('../../services/tickets.service.js', () => ({
      getTicketById: vi.fn().mockResolvedValue(STUB_TICKET),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tickets/1',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('title', 'Screen broken')
  })

  it('returns 404 for missing ticket', async () => {
    vi.doMock('../../services/tickets.service.js', () => ({
      getTicketById: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tickets/999',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/v1/tickets/:id/events', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 + event list', async () => {
    vi.doMock('../../services/tickets.service.js', () => ({
      getTicketEvents: vi.fn().mockResolvedValue([STUB_EVENT]),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/tickets/1/events',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toHaveProperty('eventType', 'status_changed')
  })
})

describe('POST /api/v1/tickets', () => {
  beforeEach(() => vi.resetModules())

  it('returns 201 + created ticket with createdById from token', async () => {
    const createTicket = vi.fn().mockResolvedValue({ ...STUB_TICKET, createdById: 2 })
    vi.doMock('../../services/tickets.service.js', () => ({ createTicket }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 2, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Screen broken', priority: 'high' },
    })
    expect(res.statusCode).toBe(201)
    // createdById is set from the JWT, not the body
    expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({ createdById: 2 }))
  })

  it('returns 400 on missing title', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'no title' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 for invalid priority value', async () => {
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'end_user' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tickets',
      headers: { authorization: `Bearer ${token}` },
      payload: { title: 'Test', priority: 'urgent' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/v1/tickets/:id', () => {
  beforeEach(() => vi.resetModules())

  it('returns 200 with updated ticket on status change', async () => {
    const updateTicket = vi.fn().mockResolvedValue({ ...STUB_TICKET, status: 'in_progress' })
    vi.doMock('../../services/tickets.service.js', () => ({ updateTicket }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'it_staff' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/tickets/1',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'in_progress' },
    })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload)).toHaveProperty('status', 'in_progress')
    // actorId comes from the JWT
    expect(updateTicket).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ status: 'in_progress' }),
    )
  })

  it('returns 404 when ticket not found', async () => {
    vi.doMock('../../services/tickets.service.js', () => ({
      updateTicket: vi.fn().mockResolvedValue(null),
    }))
    vi.doMock('../../db/client.js', () => ({ db: { execute: vi.fn().mockResolvedValue([]) } }))
    const { buildServer } = await import('../../server.js')
    const { signToken } = await import('../../auth/jwt.js')
    const token = signToken({ userId: 1, role: 'admin' })
    const app = await buildServer()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/tickets/999',
      headers: { authorization: `Bearer ${token}` },
      payload: { status: 'resolved' },
    })
    expect(res.statusCode).toBe(404)
  })
})
