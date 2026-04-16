# Agent Collaboration Log

Single source of truth for which agent owns which ticket. **Read this file before claiming work. Update it the moment you claim, finish, or release a ticket.**

## How to use
1. **Before starting work**: open this file, find your ticket in the Backlog table, and move its row to "In Progress" with your agent id, branch name, and timestamp.
2. **Before touching `shared/`** (DB schema, auth middleware, notification interface, shared types): add an entry to the "Shared Resource Claims" section. Only one agent may hold a shared claim at a time.
3. **Before adding a DB migration**: rebase on main, grab the next migration number, and note it in "Migration Reservations".
4. **On completion**: move the row to "Done", link the PR, and release any shared claims.
5. **If blocked**: add a note in "Blockers" with what you need and from whom.

## Ownership rules
- Stay inside your epic's module directory. Cross-module needs go through the other module's public API.
- Do not edit another agent's in-progress files. If you need a change there, leave a note in "Cross-agent Requests".
- Conflict on a shared file = whoever claimed first wins; the other waits or picks a different ticket.
- Never force-push a branch another agent may have based work on.

---

## Backlog
| Ticket | Epic | Story | Module | Notes |
|--------|------|-------|--------|-------|
| T-0.1 | 0 | Repo scaffolding & tooling | root | BLOCKING — must finish first |
| T-0.2 | 0 | DB schema & migrations | shared | BLOCKING |
| T-0.3 | 0 | Auth middleware & RBAC | shared | BLOCKING |
| T-0.4 | 0 | Notification service interface | shared | BLOCKING |
| T-1.1 | 1 | Login endpoint + UI | auth | depends on 0.* |
| T-1.2 | 1 | Dashboard shell & nav | auth | |
| T-1.3 | 1 | Logout endpoint | auth | |
| T-2.1 | 2 | CRUD users API | users | |
| T-2.2 | 2 | User management UI | users | |
| T-2.3 | 2 | Audit logging for user changes | users | |
| T-3.1 | 3 | CRUD assets API | assets | |
| T-3.2 | 3 | Assign/unassign asset | assets | |
| T-3.3 | 3 | Asset management UI | assets | |
| T-4.1 | 4 | Submit ticket API + UI | tickets | |
| T-4.2 | 4 | View & update ticket | tickets | |
| T-4.3 | 4 | Notify IT staff | tickets | uses NotificationService |
| T-5.1 | 5 | Report definitions | reports | read-only cross-module |
| T-5.2 | 5 | Report UI | reports | |
| T-5.3 | 5 | CSV/PDF export | reports | |
| T-6.1 | 6 | Device registry | monitoring | |
| T-6.2 | 6 | Health check worker | monitoring | |
| T-6.3 | 6 | Alerting on issues | monitoring | uses NotificationService |
| T-6.4 | 6 | Monitoring dashboard widget | monitoring | |
| T-7.1 | 7 | E2E smoke tests | root | after wave 3 |
| T-7.2 | 7 | Observability | shared | coordinate via claims |
| T-7.3 | 7 | Security hardening | cross | coordinate via claims |

## In Progress
| Ticket | Agent | Branch | Claimed At | Notes |
|--------|-------|--------|------------|-------|
| CD-1 | claude-sonnet-4-6 | feature/cd-healthcheck-endpoint | 2026-04-11 | /api/healthz endpoint |
| T-5.1 + T-5.2 | claude-sonnet-4-6 | feat/story-5.1-5.2-reports | 2026-04-16 | In Review — PR #177 |
| T-3.1 + T-3.2 + T-3.3 | Nino | feat/story-3.1-3.3-assets-crud-ui | 2026-04-15 | In Review — PR #165 |

## Done
| Ticket | Agent | PR | Merged At |
|--------|-------|----|-----------|
| T-4.3 + T-6.1 + T-6.2 + T-6.3 + T-6.4 | claude-sonnet-4-6 | [#176](https://github.com/dev0nyn/it-management-system/pull/176) | 2026-04-16 |
| T-1.2 | Nino | [#98](https://github.com/dev0nyn/it-management-system/pull/98) | 2026-04-10 |
| T-2.2 | Nino | [#129](https://github.com/dev0nyn/it-management-system/pull/129) | 2026-04-11 |
| T-4.1 | Nino | [#164](https://github.com/dev0nyn/it-management-system/pull/164) | 2026-04-15 |

## Shared Resource Claims
Active exclusive claims on `shared/` paths. Release as soon as your PR is merged.

| Path | Agent | Reason | Claimed At | Expected Release |
|------|-------|--------|------------|------------------|
| _(none)_ | | | | |

## Migration Reservations
Sequential — grab the next number, don't skip.

| # | Filename | Agent | Ticket | Status |
|---|----------|-------|--------|--------|
| 0001 | initial_schema | _(Epic 0 owner)_ | T-0.2 | reserved |
| 0001 | tickets_table | Nino | T-4.1 | merged |
| 0002 | assets_table | Nino | T-3.1 | reserved |
| 0003 | monitoring_tables | claude-sonnet-4-6 | T-6.1 | reserved |

## Cross-agent Requests
Need a change in someone else's module? Drop it here instead of editing their code.

| From | To | Ticket | Request | Status |
|------|----|--------|---------|--------|
| _(none)_ | | | | |

## Blockers
| Ticket | Agent | Blocked By | Notes |
|--------|-------|-----------|-------|
| _(none)_ | | | |
