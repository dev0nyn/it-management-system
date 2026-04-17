# IT Management System — System Flow & Feature Audit

> Generated: 2026-04-17

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER (Next.js 14)                │
│                                                          │
│  /login → /dashboard → /tickets → /assets → /reports    │
│                      → /users → /monitoring              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST /api/v1
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (Fastify)                    │
│              JWT Auth Middleware (RBAC)                  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Users   │ │ Tickets  │ │  Assets  │ │  Reports  │  │
│  │ Service  │ │ Service  │ │ Service  │ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│                                                          │
│  ┌──────────────────────┐  ┌────────────────────────┐   │
│  │  Monitoring Service  │  │    Auth Service        │   │
│  │  + BullMQ Worker     │  │  (login/logout/JWT)    │   │
│  └──────────────────────┘  └────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       ┌─────────────┐       ┌─────────────┐
       │ PostgreSQL  │       │    Redis    │
       │  (primary)  │       │  (BullMQ)  │
       └─────────────┘       └─────────────┘
```

---

## 2. Authentication Flow

```
User → /login page
       │
       ▼
  Enter email + password
       │
       ▼
  POST /api/auth/login
       │
  ┌────┴─────────────────────────────────┐
  │   Auth Service                        │
  │   1. Lookup user by email             │
  │   2. Verify password (argon2)         │
  │   3. Return { accessToken (15m),      │
  │               refreshToken (7d) }     │
  └────┬─────────────────────────────────┘
       │
  ✓ Success → Store tokens in localStorage → Redirect /dashboard
  ✗ Fail    → Show error banner
       │
       ▼
  Subsequent requests attach: Authorization: Bearer <accessToken>
       │
       ▼
  JWT Middleware verifies token → injects { userId, role } into request
```

---

## 3. User Roles & Permissions

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all modules including user management |
| `it_staff` | Tickets (manage), Assets (manage), Reports, Monitoring |
| `end_user` | Tickets (own only), Assets (own only) |

```
RBAC Enforcement:
  Route Level → requireRole('admin') or requireAnyRole(['admin', 'it_staff'])
  Data Level  → end_user automatically filtered to own records
  UI Level    → action buttons hidden/shown based on decoded JWT role
```

---

## 4. Module-by-Module System Flow

---

### 4.1 Users Module

**Status: FULLY OPERATIONAL**

```
/users (admin only)
│
├─ LOAD  →  GET /api/v1/users?page=1&limit=10&search=...
│           Response: { users[], total, page }
│
├─ [Add User] button
│     │
│     ▼
│  UserFormSheet dialog opens
│     │
│  Fill: name, email, password, role
│     │
│  POST /api/v1/users
│     ├─ ✓ → Refresh list, show toast
│     └─ ✗ EMAIL_CONFLICT → "Email already in use"
│
├─ [⋮] → Edit
│     │
│     ▼
│  UserFormSheet pre-filled
│     │
│  PATCH /api/v1/users/{id}
│     └─ ✓ → Update row in-place
│
├─ [⋮] → Delete
│     │
│     ▼
│  Confirmation dialog
│     │
│  DELETE /api/v1/users/{id}
│     └─ ✓ → Remove from list
│
└─ Search input (debounced 300ms)
      └─ GET /api/v1/users?search={term}
```

---

### 4.2 Tickets Module

**Status: FULLY OPERATIONAL**

```
/tickets
│
├─ LOAD  →  GET /api/v1/tickets (role-filtered)
│           end_user: own tickets only
│           it_staff/admin: all tickets
│
├─ Kanban Board View
│   Columns: Open │ In Progress │ Resolved │ Closed
│
├─ [New Ticket] button
│     │
│     ▼
│  TicketSubmitSheet dialog
│     Fill: title, description, priority, category
│     │
│  POST /api/v1/tickets
│     └─ ✓ → Card appears in "Open" column
│
├─ [Card] click → Detail Sheet
│     │
│  GET /api/v1/tickets/{id}
│     │
│  Editable fields (it_staff/admin): status, priority, assignee
│     │
│  PATCH /api/v1/tickets/{id}
│     └─ ✓ → Update card, show toast
│
├─ Drag-and-drop card between columns
│     │
│  Optimistic UI update (instant column move)
│     │
│  PATCH /api/v1/tickets/{id} { status: new_status }
│     ├─ ✓ → Confirm move
│     └─ ✗ → Rollback card to original column
│
├─ [Take] button (it_staff/admin on card)
│     │
│  PATCH /api/v1/tickets/{id} { assigneeId: current_user_id }
│     └─ ✓ → Assignee badge updates on card
│
├─ [⋮] → Delete (it_staff/admin)
│     │
│  Confirmation dialog
│     │
│  DELETE /api/v1/tickets/{id}
│     └─ ✓ → Card removed
│
├─ Filter by assignee dropdown
│     └─ GET /api/v1/tickets?assigneeId={id}
│
└─ Search bar
      └─ GET /api/v1/tickets?search={term}
```

---

### 4.3 Assets Module

**Status: FULLY OPERATIONAL**

```
/assets
│
├─ LOAD  →  GET /api/v1/assets?page=1&limit=20
│           end_user: own assets only
│
├─ [Add Asset] button (it_staff/admin)
│     │
│     ▼
│  Asset form dialog
│     Fill: tag, name, type, serial, status, notes
│     │
│  POST /api/v1/assets
│     ├─ ✓ → Add to table
│     └─ ✗ TAG_CONFLICT → "Asset tag already exists"
│
├─ [Edit] on row (it_staff/admin)
│     │
│  PATCH /api/v1/assets/{id}
│     └─ ✓ → Update row
│
├─ [Delete] on row (it_staff/admin)
│     │
│  Confirmation dialog
│     │
│  DELETE /api/v1/assets/{id}
│     └─ ✓ → Remove row
│
├─ [Assign] button (it_staff/admin)
│     │
│     ▼
│  Assign dialog opens
│     │
│  GET /api/v1/assets/users?search=...  (user search with debounce)
│     │
│  Select user → POST /api/v1/assets/{id}/assign { userId }
│     ├─ ✓ → Update status to "assigned", show assignee name
│     ├─ ✗ ALREADY_ASSIGNED → Prompt: "Force reassign?"
│     │        └─ Confirm → POST with { force: true }
│     │
│  GET /api/v1/assets/{id}/history  (loaded in dialog)
│     └─ Shows previous assignment log
│
├─ [Unassign] (it_staff/admin)
│     │
│  POST /api/v1/assets/{id}/unassign
│     └─ ✓ → Status reverts to "available"
│
├─ Status filter dropdown
│     └─ GET /api/v1/assets?status={status}
│
└─ Search bar
      └─ GET /api/v1/assets?search={term}
```

---

### 4.4 Reports Module

**Status: FULLY OPERATIONAL**

```
/reports
│
├─ Date range selector
│   Presets: Last 7 / 30 / 90 / 180 / 365 Days
│   Custom range picker
│
├─ LOAD  →  GET /api/v1/reports/{id}?from=...&to=...
│           Called for all 4 report types in parallel
│
├─ Report: Tickets by Status (Donut Chart)
│     GET /api/v1/reports/tickets-by-status
│     → { status, count }[]
│
├─ Report: Resolution Time by Category (Bar Chart)
│     GET /api/v1/reports/tickets-by-resolution-time
│     → { category, avgHours }[]
│
├─ Report: Assets by Status (Donut Chart)
│     GET /api/v1/reports/assets-by-status
│     → { status, count }[]
│
├─ Report: User Activity (Bar Chart)
│     GET /api/v1/reports/user-activity
│     → { userName, created, resolved }[]
│
├─ [Export CSV] per report
│     GET /api/v1/reports/{id}/export?format=csv&from=...&to=...
│     → Downloads .csv file
│
├─ [Export PDF] per report
│     GET /api/v1/reports/{id}/export?format=pdf&from=...&to=...
│     → Downloads .pdf file
│
└─ [Export All] button
      → Client-side aggregation using pdf-lib
      → Combines all report data into single PDF download
```

---

### 4.5 Monitoring Module

**Status: PARTIALLY OPERATIONAL** *(missing: device registration UI)*

```
/monitoring
│
├─ LOAD  →  GET /api/v1/devices       (device list)
│       →  GET /api/v1/alerts         (open alerts)
│
├─ Device Health Auto-refresh (every 30 seconds)
│     GET /api/v1/devices
│     → Updates status indicators in-place
│
├─ Device Status Indicators
│   ● Green  = Online (last check ≤ threshold)
│   ● Red    = Down   (failed > MONITORING_FAIL_THRESHOLD checks)
│   ● Grey   = Unknown (never checked)
│
├─ Background Worker (BullMQ on Redis)
│     Schedule: every MONITORING_DEFAULT_INTERVAL_SEC seconds
│     │
│     ▼
│  For each registered device:
│     → Ping device (HTTP GET or ICMP)
│     → Record check result in device_status_log
│     │
│     ├─ If fail count ≥ MONITORING_FAIL_THRESHOLD:
│     │     → Upsert open alert row
│     │     → Send notification (email via Resend + in-app)
│     │
│     └─ If device recovers:
│           → Close open alert row
│           → Send recovery notification
│
├─ Open Alerts list
│   Shows: device name, down since, consecutive failures
│
├─ [Delete Device] (it_staff/admin)
│     Confirmation dialog
│     DELETE /api/v1/devices/{id}
│     └─ ✓ → Remove device + stop health checks
│
└─ ⚠ MISSING: No UI to register new devices
      Backend: POST /api/v1/devices exists (admin only)
      Workaround: Direct API call
```

---

### 4.6 Dashboard Module

**Status: FULLY OPERATIONAL**

```
/dashboard
│
├─ LOAD (parallel data fetch)
│   ├─ GET /api/v1/tickets         → KPI + recent list + trend chart
│   ├─ GET /api/v1/reports/assets-by-status  → Asset distribution donut
│   └─ GET /api/v1/devices         → System health %
│
├─ KPI Cards
│   ┌────────────────────┬────────────────────┐
│   │  Active Tickets    │  Assets Assigned % │
│   │  (open+in_progress)│  (assigned/total)  │
│   ├────────────────────┼────────────────────┤
│   │  System Health %   │  Open Alerts       │
│   │  (online/total dev)│  (unresolved)      │
│   └────────────────────┴────────────────────┘
│
├─ Area Chart: Tickets Created vs Resolved (7 days)
│
├─ Donut Chart: Asset Distribution by Status
│
├─ Recent Tickets list (last 5)
│   └─ "View All" → navigate to /tickets
│
├─ Monitoring Status Widget
│   └─ Shows online/down device count
│
└─ [View Reports] button → navigate to /reports
```

---

## 5. Notification Flow

```
Event occurs (ticket update, device down, etc.)
          │
          ▼
  NotificationService.send({ type, recipients, payload })
          │
     ┌────┴────────────────────────────────┐
     ▼                                     ▼
  SMTP Adapter (Resend)             In-App Notification
  → HTML email template             → Stored in DB
  → Delivered to recipient email    → Shown in UI (bell icon)
          │
  DEV: console adapter logs instead of sending
```

---

## 6. Alert De-duplication Flow

```
Device check fails
     │
     ▼
alerts table: does open alert exist for this device?
     │
  ┌──┴──────────────────────────────┐
  │ NO                              │ YES
  ▼                                 ▼
INSERT new alert row           UPDATE: increment fail count
(status = 'open')              (no duplicate email sent)
     │
     ▼
Send "device down" notification
     │
     ▼
Device recovers (check passes)
     │
     ▼
UPDATE alert (status = 'resolved', resolvedAt = now)
     │
     ▼
Send "device recovered" notification
```

---

## 7. Feature Completeness Summary

| Module | Create | Read | Update | Delete | Special | Status |
|--------|:------:|:----:|:------:|:------:|---------|--------|
| **Users** | ✓ | ✓ | ✓ | ✓ | Search, Pagination | ✅ Full |
| **Tickets** | ✓ | ✓ | ✓ | ✓ | Kanban DnD, Assign, Filter | ✅ Full |
| **Assets** | ✓ | ✓ | ✓ | ✓ | Assign, Unassign, History | ✅ Full |
| **Reports** | — | ✓ | — | — | Export CSV/PDF, Charts | ✅ Full |
| **Monitoring** | ⚠ | ✓ | — | ✓ | Auto-refresh, Alerts | ⚠ Partial |
| **Dashboard** | — | ✓ | — | — | KPIs, Live Charts | ✅ Full |
| **Auth** | — | — | — | — | Login/Logout, JWT | ✅ Full |

**Overall: 6 of 7 modules fully operational. 1 minor gap (device registration UI).**

---

## 8. API Route Inventory (28 Routes)

```
Auth
  POST   /api/auth/login
  POST   /api/auth/logout
  GET    /api/healthz

Users             (admin only)
  GET    /api/v1/users
  POST   /api/v1/users
  GET    /api/v1/users/:id
  PATCH  /api/v1/users/:id
  DELETE /api/v1/users/:id

Tickets           (role-filtered)
  GET    /api/v1/tickets
  POST   /api/v1/tickets
  GET    /api/v1/tickets/:id
  PATCH  /api/v1/tickets/:id
  DELETE /api/v1/tickets/:id
  GET    /api/v1/tickets/:id/events

Assets            (role-filtered)
  GET    /api/v1/assets
  POST   /api/v1/assets
  GET    /api/v1/assets/:id
  PATCH  /api/v1/assets/:id
  DELETE /api/v1/assets/:id
  POST   /api/v1/assets/:id/assign
  POST   /api/v1/assets/:id/unassign
  GET    /api/v1/assets/:id/history
  GET    /api/v1/assets/users

Reports           (admin, it_staff)
  GET    /api/v1/reports
  GET    /api/v1/reports/:id
  GET    /api/v1/reports/:id/export

Monitoring        (admin, it_staff)
  GET    /api/v1/devices
  POST   /api/v1/devices
  GET    /api/v1/devices/:id
  DELETE /api/v1/devices/:id
  GET    /api/v1/devices/:id/status-log
  GET    /api/v1/alerts
```

---

## 9. Known Gap

| Gap | Severity | Description | Fix |
|-----|----------|-------------|-----|
| Device Registration UI | Low | No frontend form to add new monitored devices. Backend `POST /api/v1/devices` is ready. | Add "Add Device" dialog to `/monitoring` page |

---

*End of System Flow Document*
