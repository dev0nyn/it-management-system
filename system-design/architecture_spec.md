# IT Management System — Production Architecture Specification

## 1. Architecture Overview

The IT Management System is a **modular monorepo** delivering six end-user modules — Auth, Users, Assets, Tickets, Reports, Monitoring — behind a single Next.js dashboard, plus a background worker for device health checks and alerting.

### Why a Monorepo with Separate Services?

- **Module isolation.** Each service owns its routes, business logic, DB access, and tests. No cross-table reads — cross-module data goes through HTTP.
- **Shared types.** TypeScript types flow from `shared/` to both services and the web app with zero duplication.
- **Independent deployability.** Each service is a separate Fastify process; the web layer only handles SSR and client state.
- **Background durability.** Monitoring worker uses BullMQ on Redis — schedules survive restarts and never double-fire.

---

## 2. System Diagram

```text
Browser ──► Next.js (apps/web)
              │  SSR + client state only
              ▼
         API Gateway  REST /api/v1/
              │
   ┌──────────┼────────────┬──────────────┬────────────┐
   ▼          ▼            ▼              ▼            ▼
auth svc   users svc   assets svc   tickets svc  reports svc
                                        │
                                        ▼
                               NotificationService ──► SMTP / in-app
                                        ▲
                                        │
                              monitoring worker (BullMQ cron)
                                        │
                                        ▼
                                  PostgreSQL 16
                                  (shared DB, module-scoped tables)
```

Each service is a Fastify process. The web app calls services over HTTP — it has **no direct DB access**.

---

## 3. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Language | TypeScript (strict) | Shared types across web + services |
| Package manager | **pnpm workspaces** | Fast, strict, monorepo-native |
| Backend runtime | Node.js 20 LTS | Matches Dockerfile base |
| API framework | **Fastify** | Lean, typed, schema-first validation |
| Frontend | Next.js 14 (App Router) + React 18 | SSR + file-based routing |
| UI | Tailwind CSS + shadcn/ui | Accessible primitives, rapid development |
| ORM | **Drizzle** | Typed, migration-first, no runtime reflection |
| Database | PostgreSQL 16 | Single source of truth |
| Auth | **JWT (access + refresh) + argon2** | Stateless API, industry-standard hashing |
| Background worker | **BullMQ on Redis** | Durable scheduling, no dropped/double jobs |
| Notifications | `NotificationService` interface; SMTP (Nodemailer) + in-app | Swappable per environment |
| Testing | Vitest (unit), Supertest (integration), Playwright (E2E) | One toolchain per layer |
| Lint / format | ESLint + Prettier | Enforced via pre-commit and CI |
| Container | Docker + docker-compose | Dev/CI parity |
| CI/CD | GitHub Actions | Typecheck → lint → test → build → deploy |

---

## 4. Monorepo Layout

```text
.
├── apps/
│   └── web/                      # Next.js dashboard (SSR + UI only)
│       ├── app/                  # App Router: pages, layouts
│       │   ├── (auth)/           # Login / logout pages
│       │   ├── dashboard/
│       │   ├── assets/
│       │   ├── tickets/
│       │   ├── reports/
│       │   └── monitoring/
│       └── components/           # shadcn/ui + custom components
├── services/
│   ├── auth/                     # Login, token issue/refresh, logout
│   ├── users/                    # CRUD users, RBAC
│   ├── assets/                   # Asset inventory + assignment history
│   ├── tickets/                  # Ticket lifecycle + event timeline
│   ├── reports/                  # Read-only aggregations + CSV/PDF export
│   └── monitoring/               # Device registry + health-check worker
│       └── worker/               # BullMQ repeatable jobs
├── shared/
│   ├── db/
│   │   ├── schema/               # Drizzle table definitions (one file per module)
│   │   └── migrations/           # Sequential: 0001_init.sql, 0002_…
│   ├── auth/                     # JWT helpers + requireRole middleware
│   ├── notifications/            # NotificationService interface + adapters
│   └── types/                    # Cross-module TypeScript types
├── tasks/
│   ├── project-plan.md
│   ├── agent-collab.md
│   ├── todo.md
│   └── lessons.md
├── docker-compose.yml
└── .env.example
```

Each service follows the same internal structure:

```text
services/<module>/
├── src/
│   ├── routes.ts        # Fastify route declarations (thin: validation + auth only)
│   ├── service.ts       # Business logic
│   ├── repository.ts    # All DB access via Drizzle (no raw queries elsewhere)
│   └── types.ts         # Module-local types
└── tests/
    ├── unit/
    └── integration/
```

---

## 5. Key Design Patterns

### Thin Routes, Fat Services
Fastify handlers do three things only: validate input, check auth, shape the response. All business logic lives in `service.ts`; all DB access lives in `repository.ts`.

### Repository Pattern over Drizzle
No Drizzle queries outside `repository.ts`. This makes SQL auditable in one place per module and keeps unit tests mockable.

### RBAC as Route-Level Middleware
```typescript
// services/users/src/routes.ts
fastify.delete('/users/:id', {
  preHandler: [requireRole('admin')],
  handler: deleteUserHandler,
});
```
Authorization never lives inside business logic.

### Shared Error Envelope
All APIs return a consistent error shape on failure:
```typescript
// 4xx / 5xx responses
{ error: { code: string; message: string; details?: unknown } }
```
The frontend has a single error handler for the whole app.

### Audit Log via Domain Events
Mutations emit a typed event; a single subscriber writes `audit_log` rows. No module re-invents audit code.

### NotificationService Interface
Tickets and Monitoring import an interface, not an SMTP client:
```typescript
// shared/notifications/interface.ts
export interface NotificationService {
  notify(channel: NotificationChannel, payload: NotificationPayload): Promise<void>;
}
```
Dev uses a `ConsoleAdapter`; production uses `SmtpAdapter`. Swapping is a one-file change.

### Idempotent, Sequential Migrations
Migrations are numbered `0001_…`, `0002_…`. Before writing a migration, agents reserve the number in `tasks/agent-collab.md`. No two agents may hold the same number.

### Alert De-duplication
A device transitioning to `down` opens exactly one `alerts` row. Subsequent failing checks update it rather than insert new rows. Recovery sets `resolvedAt`. This prevents alert spam.

### Durable Background Jobs
Monitoring checks are BullMQ repeatable jobs. A worker restart resumes from schedule — no missed or double-fired checks.

---

## 6. Database Schema

All tables defined as Drizzle table objects in `shared/db/schema/`. One file per module.

### Core Tables

**users** — `id uuid PK`, `email unique`, `password_hash`, `role enum(admin, it_staff, end_user)`, `department`, `deleted_at nullable`, `created_at`, `updated_at`

**assets** — `id uuid PK`, `asset_tag unique`, `name`, `serial_number unique`, `category`, `status enum(in_stock, assigned, repair, retired)`, `purchase_date`, `warranty_expiry`, `created_at`, `updated_at`

**asset_assignments** — `id uuid PK`, `asset_id FK(assets)`, `user_id FK(users)`, `assigned_at`, `returned_at nullable`  
*(Full assignment history; current holder = latest row with null returned_at)*

**tickets** — `id uuid PK`, `title`, `description`, `priority enum(low, medium, high, urgent)`, `status enum(open, assigned, in_progress, pending_user, resolved, closed)`, `category`, `requester_id FK(users)`, `assignee_id FK(users) nullable`, `asset_id FK(assets) nullable`, `resolution_note nullable`, `created_at`, `updated_at`

**ticket_events** — `id uuid PK`, `ticket_id FK(tickets)`, `actor_id FK(users)`, `event_type`, `before jsonb`, `after jsonb`, `created_at`  
*(Immutable event timeline — every status/assignee change writes a row)*

**devices** — `id uuid PK`, `name`, `host`, `ip`, `type`, `check_interval_sec`, `status enum(up, down, unknown)`, `created_at`, `updated_at`

**device_status_log** — `id uuid PK`, `device_id FK(devices)`, `status enum(up, down)`, `checked_at`, `error_detail nullable`

**alerts** — `id uuid PK`, `device_id FK(devices)`, `first_seen_at`, `resolved_at nullable`, `last_error`

**audit_log** — `id uuid PK`, `actor_id FK(users)`, `action`, `entity`, `entity_id`, `before jsonb nullable`, `after jsonb nullable`, `created_at`

---

## 7. Security Strategy

- **Password hashing**: argon2id — never bcrypt (stronger against GPU attacks).
- **JWT**: short-lived access token (15m) + long-lived refresh token (7d). Refresh tokens stored server-side (DB or Redis) for revocation.
- **RBAC**: `requireRole('admin' | 'it_staff' | 'end_user')` middleware at the route level. Three roles, explicit deny.
- **Input validation**: Fastify JSON Schema on all routes + Zod for complex business rules.
- **Parameterized queries**: Drizzle handles this; no raw string interpolation in SQL.
- **Rate limiting**: `fastify-rate-limit` on auth endpoints — 5 attempts / minute per IP + username.
- **Secrets**: env-only. `.env` is gitignored; `.env.example` documents all required vars. Prod secrets live in CI secret store.
- **Security headers**: `helmet` plugin on Fastify.

---

## 8. Environment Variables

See `.env.example` for the full list. Required:

```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
NOTIFICATION_FROM="IT Management <no-reply@example.com>"
MONITORING_DEFAULT_INTERVAL_SEC=60
MONITORING_FAIL_THRESHOLD=3
LOG_LEVEL=info
NODE_ENV=development
```

---

## 9. Deployment

### Local Development (primary)
```bash
docker compose up
```
Starts: `postgres`, `redis`, `api` (all Fastify services), `web` (Next.js), `worker` (BullMQ).

### CI/CD (GitHub Actions)
```
typecheck → lint → test:unit → test:integration → docker build → deploy
```

### Production
Dockerized services behind a reverse proxy (Nginx or cloud LB). Each service is its own container. DB is a managed PostgreSQL instance (e.g., RDS, Neon, Supabase). Redis is a managed Redis instance (e.g., Upstash, ElastiCache).

Vercel is **not** used — the Fastify backend is stateful (BullMQ worker, DB connections) and must run on a persistent server.
