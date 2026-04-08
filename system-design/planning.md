# IT Management System — System Design & Planning

## 1. Architecture Overview

### Choice: Modular Monorepo (Fastify services + Next.js frontend)

**Justification:**
- **Module isolation.** Each of the six business modules (Auth, Users, Assets, Tickets, Reports, Monitoring) owns its routes, service layer, repository, DB tables, and tests. Cross-module reads go through HTTP — never direct table access.
- **Shared types.** TypeScript types in `shared/` flow to both services and the web app. One source of truth.
- **SSR on the frontend.** Next.js (App Router) handles SSR and client state. The web app calls Fastify services over HTTP — no direct DB queries from the frontend.
- **Durable background work.** BullMQ on Redis powers the monitoring worker. Repeatable jobs survive restarts without dropping or double-firing checks.
- **Dev parity.** `docker compose up` spins the full stack locally — the same containers CI uses.

### Core Architecture Components

| Concern | Solution |
|---------|----------|
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces |
| Backend | Fastify (one process per service) |
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| ORM | Drizzle |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh) + argon2 |
| Background jobs | BullMQ on Redis |
| Notifications | NotificationService interface (SMTP + in-app adapters) |

---

## 2. System Diagram

```text
[ Client Browser (React + Tailwind) ]
               |
               v
    [ Next.js App Router (apps/web) ]
    [ SSR + client state — no direct DB access ]
               |
               v  HTTP REST /api/v1/
    [ Fastify API (services/*) ]
    +------------------------------------------+
    | auth   users   assets  tickets  reports  |
    |                          |               |
    |                  NotificationService      |
    |                          ^               |
    |               monitoring worker (BullMQ) |
    +------------------------------------------+
               |                |
               v                v
    [ PostgreSQL 16 ]      [ Redis (BullMQ) ]
```

---

## 3. Tech Stack Justification

- **Runtime:** Node.js 20 LTS — matches Dockerfile base, broad ecosystem.
- **API Framework:** Fastify — schema-first validation, typed plugins, significantly faster than Express.
- **Frontend:** Next.js 14 (App Router) — SSR for dashboard, file-based routing, React Server Components reduce client bundle.
- **Styling:** Tailwind CSS — utility-first, no stylesheet maintenance overhead.
- **UI Components:** shadcn/ui (Radix UI based) — accessible, unstyled primitives you own, not a library dependency.
- **Language:** TypeScript strict mode — catches bugs at compile time, enables shared types across the monorepo.
- **Database:** PostgreSQL 16 — relational integrity, JSONB for event payloads, strong tooling.
- **ORM:** Drizzle — typed query builder, migration-first workflow, no runtime reflection overhead.
- **Authentication:** JWT (access token 15m + refresh token 7d) with argon2id for password hashing. Stateless API; refresh tokens stored server-side for revocation.
- **Background Jobs:** BullMQ on Redis — durable repeatable jobs, built-in retry/delay, UI via Bull Board.
- **Real-time:** WebSockets via `@fastify/websocket` for in-app notifications and the monitoring dashboard widget (30s refresh).
- **Notifications:** Internal `NotificationService` interface with a `ConsoleAdapter` for dev and `SmtpAdapter` (Nodemailer) for production.

---

## 4. Module Breakdown

| Module | Responsibility | Key API Endpoints |
|--------|---------------|-------------------|
| **Auth** | Login, token issue/refresh, logout | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| **Users** | CRUD users, RBAC enforcement | `GET/POST/PATCH/DELETE /users` |
| **Assets** | Inventory, assignment history | `GET/POST/PATCH/DELETE /assets`, `POST /assets/:id/assign` |
| **Tickets** | Ticket lifecycle, event timeline, notifications | `GET/POST/PATCH /tickets` |
| **Reports** | Aggregations, CSV/PDF export (read-only) | `GET /reports/:id`, `GET /reports/:id/export` |
| **Monitoring** | Device registry, health-check worker, alerts | `GET/POST/PATCH/DELETE /devices`, `GET /alerts` |

### Roles
Three roles with explicit deny-by-default:
- `admin` — full access to all modules
- `it_staff` — manage assets, tickets, devices; read reports
- `end_user` — submit and view own tickets; view own assigned assets

---

## 5. Database Schema

Drizzle table definitions in `shared/db/schema/` (one file per module). Migrations in `shared/db/migrations/` numbered sequentially.

```
users               id, email, password_hash, role, department, deleted_at
asset_assignments   id, asset_id → assets, user_id → users, assigned_at, returned_at
assets              id, asset_tag, name, serial_number, category, status, purchase_date, warranty_expiry
tickets             id, title, description, priority, status, category,
                    requester_id → users, assignee_id → users, asset_id → assets,
                    resolution_note
ticket_events       id, ticket_id → tickets, actor_id → users, event_type, before, after
devices             id, name, host, ip, type, check_interval_sec, status
device_status_log   id, device_id → devices, status, checked_at, error_detail
alerts              id, device_id → devices, first_seen_at, resolved_at, last_error
audit_log           id, actor_id → users, action, entity, entity_id, before, after
```

Key design decisions:
- `asset_assignments` is an **append-only history table** — current holder is the latest row with `null returned_at`. This preserves full assignment history across reassignments.
- `ticket_events` is an **immutable timeline** — every status or assignee change writes a row. Never mutate events.
- `alerts` uses one row per incident. Ongoing failures update it; recovery sets `resolved_at`. No duplicate alert rows for the same incident.
- `audit_log` is fed by domain events, not inline `INSERT` calls in every handler.
- All `id` columns are `uuid` generated server-side.

---

## 6. Service Internal Architecture

Every service under `services/` follows the same layered pattern:

```
routes.ts       ← Fastify route declarations only
                  (validation + requireRole + response shaping)
service.ts      ← Business logic
repository.ts   ← All Drizzle queries (no raw DB access elsewhere)
types.ts        ← Module-local TS types
```

**Why this matters:**
- Handlers are trivially unit-testable (mock the service).
- Repositories are independently testable against a real DB.
- SQL is auditable in one file per module.
- Authorization never bleeds into business logic.

---

## 7. Implementation Plan

> Matches `tasks/project-plan.md`. Grouped by dependency wave.

### Wave 1 — Foundation (blocking, single agent)
- [ ] Monorepo scaffold: pnpm workspaces, ESLint, Prettier, pre-commit hooks, CI config.
- [ ] `docker-compose.yml`: postgres, redis, api, web, worker.
- [ ] Drizzle schema (all tables) + initial migration + seed (admin user).
- [ ] Shared auth: JWT helpers, `requireRole` middleware, error envelope.
- [ ] `NotificationService` interface + `ConsoleAdapter`.

### Wave 2 — Auth module
- [ ] `POST /auth/login` → JWT on valid credentials, 401 otherwise. Rate-limited.
- [ ] `POST /auth/refresh` → new access token.
- [ ] `POST /auth/logout` → revoke refresh token.
- [ ] Login page + dashboard shell with role-based nav.

### Wave 3 — Business modules (parallel)
- [ ] **Agent A:** Users module — CRUD + soft-delete + audit log.
- [ ] **Agent B:** Assets module — inventory CRUD + assign/unassign + history.
- [ ] **Agent C:** Tickets module — lifecycle + event timeline + notifications.
- [ ] **Agent D:** Reports module — aggregation queries + CSV/PDF export.
- [ ] **Agent E:** Monitoring module — device registry + BullMQ worker + alerts.

### Wave 4 — Cross-cutting quality
- [ ] E2E smoke test: login → create ticket → assign asset → generate report → logout.
- [ ] Observability: structured logs, request ID, `/healthz` + `/readyz`, basic metrics.
- [ ] Security hardening: dependency audit, CSRF, security headers, secret hygiene check.

---

## 8. Parallelization Rules

- Each agent edits files **only** under its module directory + its own tests.
- Any change to `shared/` requires claiming it in `tasks/agent-collab.md` first.
- DB migrations are reserved by number in `tasks/agent-collab.md` before writing. Agents rebase before adding a new migration.
- Cross-module data goes through the owning module's HTTP API — never direct table access.
