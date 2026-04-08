# IT Management System — Architecture Overview

## Project Structure

```
.
├── system-design/
│   ├── architecture_spec.md   # Full technical specification
│   └── planning.md            # Module breakdown, DB schema, implementation plan
├── tasks/
│   ├── project-plan.md        # Epic/story breakdown with acceptance criteria
│   ├── agent-collab.md        # Parallel-agent coordination + migration reservations
│   ├── todo.md                # Current session work tracking
│   └── lessons.md             # Self-improvement log
├── apps/
│   └── web/                   # Next.js 14 (App Router) dashboard
├── services/
│   ├── auth/
│   ├── users/
│   ├── assets/
│   ├── tickets/
│   ├── reports/
│   └── monitoring/            # Includes BullMQ health-check worker
├── shared/
│   ├── db/
│   │   ├── schema/            # Drizzle table definitions
│   │   └── migrations/        # Sequential numbered migrations
│   ├── auth/                  # JWT helpers + requireRole middleware
│   ├── notifications/         # NotificationService interface + adapters
│   └── types/                 # Cross-module TypeScript types
└── docker-compose.yml
```

## How to Run Locally

```bash
cp .env.example .env         # fill in secrets
pnpm install                 # install all workspace deps
docker compose up            # postgres + redis + api + web + worker
```

See `.env.example` for all required environment variables.

## Stack Summary

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces |
| Backend API | Fastify |
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| ORM | Drizzle |
| Database | PostgreSQL 16 |
| Auth | JWT + argon2 |
| Background jobs | BullMQ on Redis |

## Key Architectural Patterns

- **Module-per-epic isolation** — each service under `services/` owns its own routes, service layer, repository, DB tables, and tests.
- **Thin routes, fat services** — handlers do validation + auth + response shaping only; business logic lives in `service.ts`.
- **Repository pattern** — all Drizzle queries live in `repository.ts`; no raw DB access elsewhere.
- **RBAC as route-level middleware** — `requireRole('admin' | 'it_staff' | 'end_user')` on every protected route.
- **Shared error envelope** — `{ error: { code, message, details? } }` on all failure responses.
- **Audit log via domain events** — one subscriber writes `audit_log` rows; no module re-invents this.
- **NotificationService interface** — Tickets and Monitoring depend on an interface, not an SMTP client.
- **Idempotent, sequential migrations** — numbered `0001_…`, reserved in `tasks/agent-collab.md` before writing.
- **Alert de-duplication** — one `alerts` row per incident; recovery sets `resolved_at`.
