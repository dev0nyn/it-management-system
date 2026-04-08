# IT Management System — CLAUDE.md

Project-specific rules for agents working in this repo. Global engineering principles live in `~/.claude/CLAUDE.md` — this file only covers what's specific to the IT Management System.

---

## Project Structure & Stack

### Architecture Overview
The IT Management System is a modular monorepo delivering five end-user modules — **Auth**, **Users**, **Assets**, **Tickets**, **Reports**, **Monitoring** — behind a single web dashboard, plus a background worker for device health checks and alerting. See `tasks/project-plan.md` for the full epic/story breakdown and `tasks/agent-collab.md` for parallel-agent coordination.

High-level flow (mirrors the source diagram):
```
Browser ──► Next.js (web)
              │
              ▼
          API Gateway (REST /api/v1)
              │
   ┌──────────┼──────────────┬──────────────┬─────────────┐
   ▼          ▼              ▼              ▼             ▼
 auth svc  users svc     assets svc    tickets svc   reports svc
                                           │
                                           ▼
                                  NotificationService ──► email / in-app
                                           ▲
                                           │
                                 monitoring worker (cron)
                                           │
                                           ▼
                                   PostgreSQL (shared)
```

Key boundaries:
- Each module owns its own routes, services, DB tables, and tests under `services/<module>/`.
- Cross-module reads go through another module's public API — **never** direct table access.
- `shared/` holds the DB schema, auth middleware, notification interface, and shared types. Edits there require a claim in `tasks/agent-collab.md`.

### Tech Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript (strict) | Shared types across web + services |
| Package manager | **pnpm** workspaces | Fast, strict, monorepo-native |
| Backend runtime | Node.js 20 LTS | Matches Dockerfile base |
| API framework | Fastify | Lean, typed, fast; schema-first validation |
| Frontend | Next.js 14 (App Router) + React 18 | SSR + file-based routing |
| UI | Tailwind CSS + shadcn/ui | Consistent, accessible primitives |
| ORM | Drizzle | Typed, migration-first, no runtime reflection |
| Database | PostgreSQL 16 | Single source of truth for all modules |
| Auth | JWT (access + refresh), argon2 for password hashing | Stateless API, industry-standard hashing |
| Background worker | BullMQ on Redis | Durable scheduling for monitoring checks |
| Notifications | Internal `NotificationService` interface; SMTP adapter (Nodemailer) + in-app fallback | Swappable per environment |
| Testing | Vitest (unit), Supertest (integration), Playwright (E2E) | One toolchain per layer |
| Lint / format | ESLint + Prettier | Enforced via pre-commit and CI |
| Container | Docker + docker-compose | Parity between dev and CI |
| CI/CD | GitHub Actions | Typecheck → lint → test → build → deploy |

Workspace layout:
```
.
├── apps/
│   └── web/                  # Next.js dashboard
├── services/
│   ├── auth/
│   ├── users/
│   ├── assets/
│   ├── tickets/
│   ├── reports/
│   └── monitoring/           # includes the health-check worker
├── shared/
│   ├── db/
│   │   ├── schema/           # Drizzle schema
│   │   └── migrations/       # sequential, numbered
│   ├── auth/                 # JWT + RBAC middleware
│   ├── notifications/        # NotificationService interface
│   └── types/                # cross-module TS types
├── tasks/
│   ├── project-plan.md
│   ├── agent-collab.md
│   ├── todo.md
│   └── lessons.md
└── docker-compose.yml
```

### Environment
Local dev runs entirely through `docker compose up`:
- `postgres` — main DB, seeded with one admin user
- `redis` — BullMQ queue for monitoring worker
- `api` — aggregated Fastify services
- `web` — Next.js dev server
- `worker` — monitoring health checks

Required environment variables (see `.env.example`):
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

Rules:
- Secrets come from env only — **never** committed. `.env` is gitignored; `.env.example` stays in sync.
- Any new env var MUST be added to `.env.example` in the same PR that introduces it.
- Production secrets live in the CI/CD secret store; no local secrets in CI logs.

### Key Design Patterns
- **Module-per-epic isolation.** Every module under `services/` is self-contained: routes, handlers, domain services, repositories, tests. Cross-module needs go through HTTP, not shared functions.
- **Thin routes, fat services.** Fastify handlers do validation + auth + response shaping only. Business logic lives in `service.ts`; DB access lives in `repository.ts`. This keeps handlers trivially testable.
- **Repository pattern over Drizzle.** No raw queries outside `repository.ts`. Makes mocking in unit tests simple and keeps SQL auditable in one place per module.
- **RBAC as middleware, not sprinkled `if` statements.** `requireRole('admin' | 'it_staff' | 'end_user')` is attached at the route level. Authorization never lives inside business logic.
- **Shared error envelope.** All APIs return `{ error: { code, message, details? } }` on failure. Frontend has one error handler for the whole app.
- **Audit log via domain events.** Mutations emit a typed event; a single audit subscriber writes `audit_log` rows. Prevents every module from reinventing audit code.
- **NotificationService interface.** Tickets and Monitoring depend on an interface, not an SMTP client. Dev uses a console adapter; prod uses SMTP. Swapping providers is a one-file change.
- **Idempotent migrations, sequential numbering.** Migrations are numbered `0001_…`, `0002_…` and reserved in `tasks/agent-collab.md` before being written. No parallel agent may grab the same number.
- **Background work is durable.** Monitoring checks are BullMQ jobs with repeatable schedules — a worker restart never drops a schedule or double-fires a check.
- **Alert de-duplication by incident.** A device transitioning to `down` opens one `alerts` row; subsequent failing checks update it instead of spamming new alerts. Recovery closes it.
- **Feature flags only when justified.** Per global rules: no speculative flags, no backwards-compat shims. Small, direct changes win.

---

## Agent Intelligence & Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 4a. Mandatory Pre-PR Local Checklist (NON-NEGOTIABLE)
Before ANY `git push` or PR creation, run ALL of these in order. If any fails, fix it first:
```bash
pnpm run typecheck       # MUST pass — catches TS errors before CI does
pnpm run lint            # MUST pass — no lint violations
pnpm run test:unit       # MUST pass — unit tests green
```
If a Dockerfile was changed or a new workspace dependency added, also run:
```bash
docker build -f services/<svc>/Dockerfile . --no-cache 2>&1 | tail -5
```
Local tests must be 1:1 with GitHub Actions. If it passes locally, it MUST pass in CI.
When adding `"@playgen/X": "workspace:*"` to a service's deps, ALSO update its Dockerfile to COPY and build the package.

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
- After EVERY git push, you MUST actively monitor the CI/CD pipeline status (e.g., using `gh run list` and `gh run view`). If the pipeline fails, diagnose the trace logs and resolve all issues autonomously until the build is perfectly green.

### 7. Rate Limit Graceful Degradation
- If a Claude Code rate limit is reached mid-session, DO NOT stop or block — create GitHub issues for all remaining unstarted work
- Use `gh issue create --title "..." --body "..." --label "P1"` for each pending task
- Include enough detail in the issue body that the next agent can pick it up cold: context, acceptance criteria, files to touch, dependencies
- After creating issues, update `tasks/agent-collab.md` to reflect the hand-off
- The user should never have to manually transcribe your mental state into tickets

### 11. Migration Conflict Prevention
- Before merging any PR that touches `shared/db/migrations/`, check the Migration Reservation section in `tasks/agent-collab.md`
- If two open PRs claim the same migration number, close the older one with a comment explaining the conflict

## Task Management & Organization

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Self-Improvement Loop System

### How It Works

Every session begins and ends with a feedback cycle:

1. **Session Start**: Read `tasks/lessons.md` to load all known patterns and anti-patterns
2. **During Work**: When corrected by the user or when a mistake is caught:
   - Immediately append to `tasks/lessons.md` with date, context, and the rule
   - Categorize: `[architecture]`, `[testing]`, `[deployment]`, `[code-quality]`, `[process]`
   - Write the lesson as a **rule**, not a story (e.g., "ALWAYS do X" or "NEVER do Y")
3. **Before Completion**: Review your own work against all lessons in `tasks/lessons.md`
4. **Session End**: If new lessons were learned, ensure they are persisted

### Lesson Format

```markdown
## [category] Short title — YYYY-MM-DD

**Trigger**: What went wrong or what was corrected
**Rule**: The rule to follow going forward (ALWAYS/NEVER format)
**Why**: Root cause explanation
**Example**: Concrete code or command example if applicable
```

### Escalation Protocol

- 1st occurrence: Add lesson to `tasks/lessons.md`
- 2nd occurrence of same pattern: Promote to CLAUDE.md under Core Principles
- 3rd occurrence: Add automated check (test, lint rule, or pre-commit hook)
