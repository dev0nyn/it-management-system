# IT Management System

A full-stack IT management platform built with Next.js, PostgreSQL, and Drizzle ORM. Covers user management, asset tracking, ticketing, network monitoring, and reporting — all behind a role-based dashboard.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Drizzle |
| Auth | JWT (argon2 password hashing) |
| UI | Tailwind CSS + shadcn/ui |
| Package manager | pnpm |
| Local infra | Docker Compose |

---

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Auth | Done | Login, logout, JWT session |
| User Management | Done | CRUD users, roles, soft-delete |
| Asset Management | Done | CRUD assets, assign/unassign, history |
| Ticketing | In Progress | Submit, view, update tickets |
| Network Monitoring | Planned | Device registry, health checks, alerts |
| Reports | Planned | Cross-module analytics and CSV/PDF export |

---

## Running Locally

### Prerequisites

Make sure the following are installed before you start:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 20 LTS or later | https://nodejs.org |
| pnpm | latest | `npm install -g pnpm` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |

Verify your setup:

```bash
node -v        # should print v20.x.x or higher
pnpm -v        # should print 8.x.x or higher
docker -v      # should print Docker version ...
```

---

### Step 1 — Clone and install dependencies

```bash
git clone <repository-url>
cd it-management
pnpm install
```

---

### Step 2 — Create your local environment file

```bash
# Mac / Linux / Git Bash on Windows
cp .env.example .env.local

# PowerShell on Windows
Copy-Item .env.example .env.local
```

The defaults in `.env.example` are pre-configured for the local Docker setup — no edits needed to get started. The file will look like this:

```env
DATABASE_URL=postgres://it_admin:password@localhost:54321/it_management
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
NEXT_PUBLIC_API_URL=
```

---

### Step 3 — Start the database and Redis

```bash
pnpm run local:up
```

This starts two Docker containers in the background:
- **Postgres 16** on `localhost:54321`
- **Redis 7** on `localhost:6379`

Wait a few seconds, then verify they are running:

```bash
docker compose ps
```

You should see both services listed as `healthy` or `running`.

---

### Step 4 — Run database migrations

```bash
pnpm run db:migrate:local
```

This applies all pending SQL migrations to your local Postgres instance. Expected output:

```
  apply 0000_eminent_bedlam...
  done  0000_eminent_bedlam
  apply 0001_assets_table...
  done  0001_assets_table
✅  All migrations applied.
```

---

### Step 5 — Seed test data

```bash
pnpm run db:seed
```

This creates test user accounts and sample assets. Expected output:

```
🌱  Seeding users...
  seed  admin@itms.local  [admin]
  seed  staff@itms.local  [it_staff]
  seed  user@itms.local   [end_user]
  seed  user2@itms.local  [end_user]

🌱  Seeding assets...
  seed  LAP-001 — MacBook Pro 14″  [in_stock]
  seed  LAP-002 — Dell XPS 15      [in_stock]
  ...
✅  Seed complete!
```

> Steps 4 and 5 can be combined into one command: `pnpm run db:setup`

---

### Step 6 — Start the development server

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You will be redirected to the login page. Use any of the test accounts below.

---

### Test accounts

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@itms.local | Admin1234! | Admin | Full access — all modules, all users |
| staff@itms.local | Staff1234! | IT Staff | Assets, tickets, monitoring — no user management |
| user@itms.local | User1234! | End User | Own tickets, own assigned assets only |
| user2@itms.local | User1234! | End User | Own tickets, own assigned assets only |

---

### Stopping and resetting

```bash
# Stop Docker containers (data is preserved)
pnpm run local:down

# Wipe all data and start fresh (re-runs migrations + seed)
pnpm run local:reset
```

---

## Manual setup (step by step — combined reference)

```bash
pnpm install
cp .env.example .env.local   # or Copy-Item on PowerShell
pnpm run local:up
pnpm run db:setup
pnpm run dev

# 5. Start the dev server
pnpm run dev
```

---

## Useful Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Next.js dev server |
| `pnpm run build` | Production build |
| `pnpm run typecheck` | TypeScript check (no emit) |
| `pnpm run lint` | ESLint |
| `pnpm run test:unit` | Run unit tests (Vitest) |
| `pnpm run local:up` | Start Docker services (Postgres + Redis) |
| `pnpm run local:down` | Stop Docker services |
| `pnpm run local:reset` | Wipe volumes, re-migrate, re-seed |
| `pnpm run db:migrate:local` | Apply pending migrations (local, no SSL) |
| `pnpm run db:seed` | Seed test users and sample assets |
| `pnpm run db:setup` | migrate:local + seed in one shot |
| `pnpm run db:generate` | Generate new Drizzle migration from schema changes |

---

## Project Structure

```
app/
  (main-pages)/         # Authenticated pages (assets, tickets, users, ...)
  api/
    auth/               # Login / logout
    v1/                 # Versioned feature API routes
lib/
  db/
    schema/             # Drizzle schema — one file per module
    migrations/         # Sequential SQL migrations
  auth/                 # JWT helpers, requireRole guard
  users/                # Users repository + service
  assets/               # Assets repository + service
  api-client.ts         # authFetch + session helpers (client-side)
components/
  ui/                   # shadcn/ui primitives (never edit manually)
  layout/               # Sidebar, header, theme toggle
shared/
  notifications/        # NotificationService interface + adapters
scripts/
  migrate-local.mjs     # Local migration runner
  migrate.mjs           # Production migration runner
  seed.mjs              # Test data seeder
  setup-local.sh        # One-command local bootstrap
tasks/
  AGENT_CHECKLIST.md    # Pre-work gate checklist for contributors
  lessons.md            # Anti-pattern log
  agent-collab.md       # Ticket ownership + migration reservations
  project-plan.md       # Epics, stories, acceptance criteria
```

---

## Contributing / Agent Guidelines

All contributors (human and AI) must follow the process in [`tasks/AGENT_CHECKLIST.md`](tasks/AGENT_CHECKLIST.md) before starting any work.

**Key rules:**
- Always use `pnpm` — never `npm`
- All work goes via PR — no direct commits to `main`
- Run `pnpm run typecheck && pnpm run lint && pnpm run test:unit` before every push
- Claim tickets in `tasks/agent-collab.md` before starting; reserve migration numbers before writing SQL
- New schema files go in `lib/db/schema/` — `drizzle.config.ts` picks them up automatically via glob

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing JWT tokens |
| `NEXT_PUBLIC_API_URL` | API base URL (empty for local dev) |
| `CORS_ORIGIN` | Allowed CORS origin (empty defaults to `*` locally) |

Never commit `.env.local`. Production secrets live in Railway / Vercel dashboard.
