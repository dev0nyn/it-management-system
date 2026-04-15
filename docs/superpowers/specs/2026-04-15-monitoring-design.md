# Epic 6 — Network Monitoring & Alerts: Design Spec

**Date:** 2026-04-15
**Stories:** #22 (6.1 Device registry), #23 (6.2 Health check worker), #24 (6.3 Alerting), #25 (6.4 Dashboard widget)
**Status:** Approved — ready for implementation

---

## Overview

Full-stack monitoring module that tracks network devices via TCP port checks, surfaces alerts on failure, and shows live status on the dashboard. Built on the existing service/repository/Drizzle pattern. Worker uses BullMQ repeatable jobs (one per device) bootstrapped via Next.js `instrumentation.ts`.

---

## 1. Database Schema

**Migration:** `lib/db/migrations/0003_monitoring_tables.sql`
**Schema file:** `lib/monitoring/schema.ts`

### `devices`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text NOT NULL | Display name |
| `host` | text NOT NULL | IP address or hostname |
| `port` | integer NOT NULL | Default 80 |
| `type` | enum | `server`, `switch`, `router`, `firewall`, `ap` |
| `status` | enum | `up`, `down`, `unknown` — default `unknown` |
| `check_interval_sec` | integer NOT NULL | Default 60, range 10–3600 |
| `consecutive_failures` | integer NOT NULL | Default 0, reset to 0 on recovery |
| `last_checked_at` | timestamp | Null until first check |
| `created_at` | timestamp | `now()` |
| `updated_at` | timestamp | `now()` |

**Unique constraint:** `(host, port)` — allows monitoring two services on the same host.

### `device_status_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `device_id` | uuid FK | → `devices(id)` CASCADE DELETE |
| `status` | enum | `up`, `down` |
| `latency_ms` | integer | Null on failure |
| `error` | text | Null on success |
| `checked_at` | timestamp | `now()` |

### `alerts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `device_id` | uuid FK | → `devices(id)` CASCADE DELETE |
| `first_seen` | timestamp | `now()` |
| `resolved_at` | timestamp | Null = open incident |
| `last_error` | text | Updated in-place on repeated failures |

**Dedup invariant:** At most one row per device where `resolved_at IS NULL`.

---

## 2. API Layer

All routes follow the thin-route pattern: validate with Zod → call service → return JSON.

### Device CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/devices` | it_staff+ | List all devices |
| `POST` | `/api/v1/devices` | admin | Create device + schedule BullMQ job |
| `PATCH` | `/api/v1/devices/[id]` | admin | Update device + reschedule job if interval changed |
| `DELETE` | `/api/v1/devices/[id]` | admin | Delete device + remove job from queue |

### Status & Alerts (read-only)

| Method | Path | Auth | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/devices/[id]/status-log` | it_staff+ | Last 50 check results |
| `GET` | `/api/v1/alerts` | it_staff+ | Alerts, filterable by `?deviceId=` and `?status=open\|resolved` |

### Zod validation (POST/PATCH devices)

```ts
const deviceSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(80),
  type: z.enum(["server", "switch", "router", "firewall", "ap"]),
  check_interval_sec: z.number().int().min(10).max(3600).default(60),
});
```

### File structure

```
lib/monitoring/
  schema.ts          ← Drizzle table + enum definitions
  repository.ts      ← all DB queries (no raw SQL outside this file)
  service.ts         ← business logic: status transitions, alert dedup
  worker.ts          ← BullMQ queue definition + job processor + scheduler sync
app/api/v1/
  devices/
    route.ts         ← GET list, POST create
    [id]/
      route.ts       ← PATCH update, DELETE
      status-log/
        route.ts     ← GET log
  alerts/
    route.ts         ← GET alerts
```

---

## 3. Worker Architecture

### BullMQ setup

- **Queue name:** `"device-health"`
- **Job key per device:** `device:<uuid>` (used as BullMQ job scheduler name)
- **Repeat:** `{ every: check_interval_sec * 1000 }` ms
- **Concurrency:** 5 parallel checks

### Job processor steps

```
1. Read device from DB by deviceId (skip silently if not found — deleted between schedule and fire)
2. TCP connect to host:port with 5s timeout
3. Write device_status_log row (status, latency_ms or error)
4. Update device: last_checked_at, consecutive_failures, status
5. Determine new status:
   - Success → status = 'up', consecutive_failures = 0
   - Failure → consecutive_failures += 1
     - If consecutive_failures >= MONITORING_FAIL_THRESHOLD → status = 'down'
6. Detect transition and call alert service:
   - prev 'up'/'unknown' → new 'down': alertService.handleDown()
   - prev 'down' → new 'up':           alertService.handleRecovery()
```

### Bootstrap — `instrumentation.ts`

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorker, schedulePendingDevices } = await import("@/lib/monitoring/worker");
    await startWorker();
    await schedulePendingDevices(); // idempotent — re-queues all DB devices on cold start
  }
}
```

`schedulePendingDevices()` uses BullMQ's `upsertJobScheduler` which is idempotent — calling it for an already-scheduled job updates the schedule without duplication.

### Job lifecycle sync

| API event | Queue action |
|-----------|-------------|
| Device created | `queue.upsertJobScheduler(key, { every: interval_ms })` |
| Device interval changed | Remove old scheduler → add new one |
| Device deleted | `queue.removeJobScheduler(key)` |

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | — | BullMQ connection |
| `MONITORING_DEFAULT_INTERVAL_SEC` | `60` | Fallback interval |
| `MONITORING_FAIL_THRESHOLD` | `3` | Consecutive failures before `down` |

---

## 4. Alert & Notification Logic

### `alertService.handleDown(device, lastError)`

```
1. Find open alert (resolved_at IS NULL) for this device
2. If exists  → UPDATE last_error only (dedup — no new notification)
3. If missing → INSERT alert row
               → NotificationService.notify('it_staff', { ... })
```

### `alertService.handleRecovery(device)`

```
1. Find open alert for this device
2. If exists  → UPDATE resolved_at = now()
               → NotificationService.notify('it_staff', { ... })
3. If missing → no-op
```

### Transition table

| prev_status | new_status | Action |
|-------------|-----------|--------|
| up / unknown | up | none |
| up / unknown | down | `handleDown()` → insert alert + notify |
| down | down | `handleDown()` → update `last_error` only |
| down | up | `handleRecovery()` → close alert + notify |

### Notification wiring

Uses the existing `NotificationService` interface (console adapter in dev, SMTP in prod). No new implementation needed — import and call the same way the tickets module does.

### Alerts API response shape

```json
{
  "alerts": [
    {
      "id": "uuid",
      "deviceId": "uuid",
      "deviceName": "Core Switch",
      "host": "192.168.1.1",
      "port": 22,
      "firstSeen": "2026-04-15T02:00:00Z",
      "resolvedAt": null,
      "lastError": "Connection refused",
      "status": "open"
    }
  ]
}
```

---

## 5. UI

### Monitoring page (`app/(main-pages)/monitoring/page.tsx`)

Replace mock data with real API calls. Three panels:

1. **Device table** — Name, Host:Port, Type, Status badge, Latency, Last Checked, Actions (admin: Edit/Delete)
2. **Active alerts list** — filterable by device; shows first-seen, last error, duration open
3. **Add/Edit device dialog** — admin only; fields: Name, Host, Port, Type, Check Interval

**Device detail:** clicking a row expands a status-log panel showing the last 50 checks as a timeline (up/down indicator + latency + timestamp).

**Auto-refresh:** `setInterval(refetch, 30_000)` — updates without full page reload (Story 6.4 AC).

**Role gating:** it_staff+ can view; admin-only buttons (Add, Edit, Delete) hidden for it_staff.

### Dashboard widget (`components/monitoring/status-widget.tsx`)

Added to the dashboard overview page. Fetches from `/api/v1/devices` (counts) and `/api/v1/alerts?status=open&limit=3`.

```
┌─────────────────────────────────┐
│  Network Health                 │
│  ● 12 Online   ✕ 2 Offline      │
│                                 │
│  Recent Alerts                  │
│  ⚠ Core Switch — 14m ago        │
│  ⚠ DB Server — 2h ago           │
│                                 │
│  [View all →]                   │
└─────────────────────────────────┘
```

Auto-refreshes every 30s. Clicking "View all →" navigates to `/monitoring`.

---

## 6. Testing

- **Unit tests** (`lib/monitoring/__tests__/service.test.ts`): alert dedup logic, status transition table, TCP check helper (mock `net.Socket`)
- **API tests** (`app/api/v1/devices/route.test.ts`): CRUD happy paths + 401/403 auth checks
- **E2E** (future — Story 7.1 extension): add a device, verify status badge updates after mock check

---

## 7. Implementation Order

0. Install `bullmq` (`pnpm add bullmq`) — not yet in package.json; sync `package-lock.json` after
1. DB migration + Drizzle schema (`lib/monitoring/schema.ts`)
2. Repository layer (`lib/monitoring/repository.ts`)
3. Service layer + alert logic (`lib/monitoring/service.ts`)
4. BullMQ worker (`lib/monitoring/worker.ts`) + `instrumentation.ts`
5. API routes (`/api/v1/devices`, `/api/v1/alerts`)
6. Monitoring page UI (replace mock data)
7. Dashboard widget
8. Unit tests

---

## 8. Out of Scope

- ICMP ping (Railway containers lack `CAP_NET_RAW`)
- HTTP response code checks (TCP suffices for this iteration)
- Per-device notification preferences
- Silencing/snoozing alerts
- Historical trend charts (status log is stored; charts are a future report)
