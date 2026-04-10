'use client'

import React, { useCallback, useEffect, useState } from 'react'

type Role = 'admin' | 'it_staff' | 'end_user'

interface User {
  id: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
}

interface PaginatedUsers {
  data: User[]
  total: number
  page: number
  limit: number
}

interface FormErrors {
  email?: string
  password?: string
  role?: string
}

const ROLES: Role[] = ['admin', 'it_staff', 'end_user']

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateForm(
  fields: { email: string; password: string; role: string },
  isCreate: boolean,
): FormErrors {
  const errors: FormErrors = {}
  if (!fields.email) {
    errors.email = 'Email is required'
  } else if (!validateEmail(fields.email)) {
    errors.email = 'Enter a valid email address'
  }
  if (isCreate) {
    if (!fields.password) {
      errors.password = 'Password is required'
    } else if (fields.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
  }
  if (!fields.role) {
    errors.role = 'Role is required'
  }
  return errors
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

interface DeleteConfirmDialogProps {
  user: User
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DeleteConfirmDialog({ user, onConfirm, onCancel, loading }: DeleteConfirmDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-sm ring-1 ring-slate-100 dark:ring-slate-700">
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-slate-800 dark:text-white mb-2"
        >
          Delete user?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          This will deactivate{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{user.email}</span>. This
          action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UserModal (create / edit)
// ---------------------------------------------------------------------------

interface UserModalProps {
  mode: 'create' | 'edit'
  initial?: User
  onSave: (fields: { email: string; password: string; role: Role }) => void
  onClose: () => void
  loading: boolean
  serverError?: string
}

function UserModal({ mode, initial, onSave, onClose, loading, serverError }: UserModalProps) {
  const [email, setEmail] = useState(initial?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<string>(initial?.role ?? '')
  const [errors, setErrors] = useState<FormErrors>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fieldErrors = validateForm({ email, password, role }, mode === 'create')
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }
    onSave({ email, password, role: role as Role })
  }

  const title = mode === 'create' ? 'New User' : 'Edit User'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-full max-w-md ring-1 ring-slate-100 dark:ring-slate-700">
        <h2
          id="user-modal-title"
          className="text-lg font-semibold text-slate-800 dark:text-white mb-4"
        >
          {title}
        </h2>
        {serverError && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{serverError}</p>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="modal-email"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
            )}
          </div>
          {/* Password (create only) */}
          {mode === 'create' && (
            <div>
              <label
                htmlFor="modal-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Password
              </label>
              <input
                id="modal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Min 8 characters"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>
          )}
          {/* Role */}
          <div>
            <label
              htmlFor="modal-role"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Role
            </label>
            <select
              id="modal-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a role</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.role}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UsersPage
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const limit = 20
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [modalOpen, setModalOpen] = useState<'create' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [serverError, setServerError] = useState<string | undefined>()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (roleFilter !== 'all') params.set('role', roleFilter)
      const res = await fetch(`/api/users?${params.toString()}`)
      const json: PaginatedUsers | { error: { message: string } } = await res.json()
      if ('error' in json) {
        console.error(json.error.message)
      } else {
        setUsers(json.data)
        setTotal(json.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  async function handleCreate(fields: { email: string; password: string; role: Role }) {
    setActionLoading(true)
    setServerError(undefined)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) {
        const json = await res.json()
        setServerError((json as { error: { message: string } }).error?.message ?? 'Failed to create user')
        return
      }
      setModalOpen(null)
      void fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleEdit(fields: { email: string; password: string; role: Role }) {
    if (!editTarget) return
    setActionLoading(true)
    setServerError(undefined)
    try {
      const body: { email?: string; role?: Role } = {}
      if (fields.email !== editTarget.email) body.email = fields.email
      if (fields.role !== editTarget.role) body.role = fields.role
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json()
        setServerError((json as { error: { message: string } }).error?.message ?? 'Failed to update user')
        return
      }
      setModalOpen(null)
      setEditTarget(null)
      void fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' })
      setDeleteTarget(null)
      void fetchUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Users</h2>
        <button
          type="button"
          onClick={() => {
            setServerError(undefined)
            setModalOpen('create')
          }}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white shadow-lg hover:bg-blue-700 h-10 py-2 px-4 transition-colors"
        >
          New User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <label htmlFor="role-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Role:
        </label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as 'all' | Role)
            setPage(1)
          }}
          className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white dark:bg-slate-800 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-slate-400 dark:text-slate-500">No users found.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {['ID', 'Email', 'Role', 'Active', 'Created At', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-slate-400 dark:text-slate-500 max-w-[6rem] truncate">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 dark:text-white">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                      aria-label={user.isActive ? 'Active' : 'Inactive'}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget(user)
                        setServerError(undefined)
                        setModalOpen('edit')
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Page {page} of {totalPages} &mdash; {total} total
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      {modalOpen === 'create' && (
        <UserModal
          mode="create"
          onSave={handleCreate}
          onClose={() => setModalOpen(null)}
          loading={actionLoading}
          serverError={serverError}
        />
      )}
      {modalOpen === 'edit' && editTarget && (
        <UserModal
          mode="edit"
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => {
            setModalOpen(null)
            setEditTarget(null)
          }}
          loading={actionLoading}
          serverError={serverError}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          user={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
