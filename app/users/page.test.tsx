import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import UsersPage from './page'

const mockUsers = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    role: 'end_user',
    isActive: false,
    createdAt: '2024-02-01T00:00:00.000Z',
  },
]

function makeFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('UsersPage', () => {
  it('renders loading state initially', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(
      new Promise(() => {
        // never resolves — keeps component in loading state
      }),
    )
    render(<UsersPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders user table when data loads', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(
      makeFetchResponse({ data: mockUsers, total: 2, page: 1, limit: 20 }),
    )
    render(<UsersPage />)
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('Edit').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Delete').length).toBeGreaterThanOrEqual(2)
  })

  it('"New User" button opens create modal', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(
      makeFetchResponse({ data: [], total: 0, page: 1, limit: 20 }),
    )
    render(<UsersPage />)
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /new user/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('Delete button triggers confirmation dialog', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(
      makeFetchResponse({ data: mockUsers, total: 2, page: 1, limit: 20 }),
    )
    render(<UsersPage />)
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/delete user/i)).toBeInTheDocument()
    // email appears in both table row and dialog — confirm it's in the dialog
    expect(dialog.textContent).toContain('alice@example.com')
  })
})
