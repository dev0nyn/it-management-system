# IT Management System — Project Plan

Derived from the system flow diagram. Organized into epics → user stories → tasks, grouped so parallel agents can work without stepping on each other. Each epic owns its own module boundary (routes, services, DB tables, tests) to minimize merge conflicts.

## Architecture Ground Rules (shared contract — freeze before parallel work)
- **Stack**: Backend API + relational DB + web frontend + background worker for monitoring/alerts. (Concrete choices to be locked in Epic 0.)
- **Module boundaries**: `auth/`, `users/`, `assets/`, `tickets/`, `reports/`, `monitoring/`. Agents MUST stay in their module except via shared contracts.
- **Shared contracts** live in `shared/` (DB schema migrations, types, auth middleware, notification service interface). Changes to `shared/` require a claim in `agent-collab.md`.
- **API style**: REST, JSON, versioned `/api/v1/...`. Auth via JWT bearer token.
- **Testing**: every ticket ships with unit + integration tests. Acceptance criteria are not met without green tests.

---

## Epic 0 — Foundation & Shared Infrastructure (BLOCKING, single agent)
Must complete before parallel work starts. One agent owns this.

### Story 0.1 — Repo scaffolding & tooling
**Tasks**
- Initialize backend project, frontend project, linter, formatter, CI config.
- Add `docker-compose.yml` for DB + app for local dev.
- Wire pre-commit hooks: lint, typecheck, test.

**Acceptance Criteria**
- `docker compose up` brings up DB + empty API + empty frontend.
- CI runs lint + typecheck + tests on PR and blocks on failure.
- README documents local setup in ≤ 5 commands.

### Story 0.2 — Database schema & migration framework
**Tasks**
- Choose migration tool; create initial migration with tables: `users`, `roles`, `assets`, `asset_assignments`, `tickets`, `ticket_events`, `devices`, `device_status_log`, `alerts`, `audit_log`.
- Seed script with one admin user.

**Acceptance Criteria**
- `migrate up` / `migrate down` both succeed on empty DB.
- Seed produces a loginable admin.
- ER diagram committed to `docs/erd.md`.

### Story 0.3 — Shared auth middleware & RBAC
**Tasks**
- JWT issue/verify helpers.
- Role-based middleware: `admin`, `it_staff`, `end_user`.
- Shared error envelope `{ error: { code, message } }`.

**Acceptance Criteria**
- Middleware rejects missing/expired/invalid tokens with 401.
- RBAC denies unauthorized roles with 403.
- Unit tests cover happy path + each rejection case.

### Story 0.4 — Shared notification service interface
**Tasks**
- Define `NotificationService` interface (email + in-app).
- Provide a no-op + console implementation for dev.

**Acceptance Criteria**
- Interface documented in `shared/notifications/README.md`.
- Tickets and Monitoring epics can import it without pulling a concrete implementation.

---

## Epic 1 — Authentication & Session (maps to: Start → Login → Valid Credentials? → Dashboard/Error → Logout)

### Story 1.1 — Login endpoint + UI
**Tasks**
- `POST /api/v1/auth/login` → returns JWT on valid credentials, 401 otherwise.
- Login page with form, error display, redirect to dashboard on success.
- Rate-limit login attempts (per IP + per username).

**Acceptance Criteria**
- Valid creds → 200 + token + redirect to `/dashboard`.
- Invalid creds → inline error "Invalid username or password" (no user enumeration).
- 5 failed attempts in 1 min → 429.
- Passwords stored hashed (bcrypt/argon2), never logged.

### Story 1.2 — Dashboard shell & navigation
**Tasks**
- Authenticated layout with nav: Users, Assets, Tickets, Reports, Monitoring, Logout.
- Hide nav items by role.

**Acceptance Criteria**
- Unauthenticated users hitting `/dashboard` are redirected to `/login`.
- End users do not see User Management or Reports nav items.
- Logout clears token and redirects to `/login`.

### Story 1.3 — Logout endpoint
**Tasks**
- `POST /api/v1/auth/logout` → invalidates refresh token / clears session.

**Acceptance Criteria**
- After logout, prior token cannot access protected routes.
- Audit log entry written.

---

## Epic 2 — User Management (maps to: User Management → Create/Update/Delete User → Save to Database)
*Owner: Agent A. Touches `users/` only.*

### Story 2.1 — CRUD users (API)
**Tasks**
- `GET/POST/PATCH/DELETE /api/v1/users` with pagination + search.
- Enforce admin-only access.

**Acceptance Criteria**
- Admin can create, list (paginated), update, soft-delete users.
- Non-admin receives 403.
- Email uniqueness enforced; duplicate returns 409.
- Soft-deleted users cannot log in.

### Story 2.2 — User management UI
**Tasks**
- Users table with search, filter by role, create/edit modals, delete confirm.

**Acceptance Criteria**
- All CRUD actions from UI reflect in DB within one network round trip.
- Form validation matches API validation (required fields, email format).
- Destructive actions require confirmation.

### Story 2.3 — Audit logging for user changes
**Tasks**
- Write audit log row on create/update/delete with actor, target, before/after.

**Acceptance Criteria**
- Every mutation produces exactly one audit row.
- Audit rows are queryable by target user id.

---

## Epic 3 — Asset Management (maps to: Asset Management → Add/Update Asset → Assign Asset → Save to Database)
*Owner: Agent B. Touches `assets/` only.*

### Story 3.1 — CRUD assets (API)
**Tasks**
- `GET/POST/PATCH/DELETE /api/v1/assets` with fields: tag, type, serial, status, purchase date, warranty.

**Acceptance Criteria**
- Asset tag is unique; duplicate returns 409.
- Status is a bounded enum (`in_stock`, `assigned`, `repair`, `retired`).
- IT staff + admin can mutate; end users read-only on assets assigned to them.

### Story 3.2 — Assign / unassign asset to user
**Tasks**
- `POST /api/v1/assets/:id/assign` body `{ userId }`; `POST /api/v1/assets/:id/unassign`.
- Create `asset_assignments` history row on each change.

**Acceptance Criteria**
- Assigning an already-assigned asset returns 409 unless `force=true`.
- Assignment history preserved across reassignments.
- Asset status transitions to `assigned` / back to `in_stock` automatically.

### Story 3.3 — Asset management UI
**Tasks**
- Assets table, create/edit form, assign dialog with user search.

**Acceptance Criteria**
- UI shows current holder and full assignment history.
- Assign dialog searches users via API (debounced).
- CSV import stub is out of scope for this epic.

---

## Epic 4 — Ticketing System (maps to: Ticketing System → Submit / View / Update Ticket → Store in DB → Notify IT Staff)
*Owner: Agent C. Touches `tickets/` only. Imports `NotificationService`.*

### Story 4.1 — Submit ticket (API + UI)
**Tasks**
- `POST /api/v1/tickets` with fields: title, description, priority, category, optional asset id.
- Submit form for end users.

**Acceptance Criteria**
- Ticket persists with `status=open`, `createdBy=currentUser`.
- On create, `NotificationService.notify('it_staff', …)` fires exactly once.
- Validation: title ≤ 120 chars, description required.

### Story 4.2 — View & update ticket
**Tasks**
- `GET /api/v1/tickets` (filter by status, assignee, priority, mine).
- `PATCH /api/v1/tickets/:id` for status/assignee/comment.
- Ticket detail page with event timeline.

**Acceptance Criteria**
- End users see only their own tickets; IT staff see all.
- Every status/assignee change writes a `ticket_events` row.
- Closing a ticket requires a resolution note.

### Story 4.3 — Notify IT staff on new/updated tickets
**Tasks**
- Hook into `NotificationService` on create and on reassignment.

**Acceptance Criteria**
- New ticket → notification to all `it_staff` role members (or assigned group).
- Reassignment → notification to new assignee only.
- Notification failures are logged but do not fail the request.

---

## Epic 5 — Reports & Analytics (maps to: Reports & Analytics → Generate Report → Display/Export Report)
*Owner: Agent D. Touches `reports/` only. Read-only access to other modules' DB views.*

### Story 5.1 — Report definitions
**Tasks**
- Implement reports: tickets by status, tickets by resolution time, assets by status, user activity.
- Date range + role filter parameters.

**Acceptance Criteria**
- Each report returns JSON with consistent envelope `{ columns, rows, generatedAt }`.
- Queries execute under 2s on seed data set (≥ 10k rows).

### Story 5.2 — Report UI (display)
**Tasks**
- Reports page listing available reports; parameter form; table + simple chart render.

**Acceptance Criteria**
- Selecting a report and submitting parameters renders results without full page reload.
- Empty results show a clear "No data" state, not a blank table.

### Story 5.3 — Export (CSV + PDF)
**Tasks**
- `GET /api/v1/reports/:id/export?format=csv|pdf`.

**Acceptance Criteria**
- CSV opens cleanly in Excel/Sheets (UTF-8 BOM, quoted fields).
- PDF includes title, parameters, generated timestamp.
- Only admin + it_staff can export.

---

## Epic 6 — Network Monitoring & Alerts (maps to: Network Monitoring → Check Device Status → Issue Detected? → Send Alert / Continue)
*Owner: Agent E. Touches `monitoring/` only. Imports `NotificationService`.*

### Story 6.1 — Device registry
**Tasks**
- `GET/POST/PATCH/DELETE /api/v1/devices` with host/ip, type, check interval.

**Acceptance Criteria**
- IP/host uniqueness enforced.
- Admin-only mutations; it_staff read-only.

### Story 6.2 — Health check worker
**Tasks**
- Background worker polls each device per its interval (ICMP or TCP port check).
- Write `device_status_log` row per check.

**Acceptance Criteria**
- Worker survives restart (resumes from schedule, no duplicate checks).
- Failing check transitions device to `down` after N consecutive failures (configurable, default 3).
- Recovery transitions back to `up` on first success.

### Story 6.3 — Alerting on detected issue
**Tasks**
- On transition to `down`, call `NotificationService` once.
- Create row in `alerts` with device, first-seen, status.
- On recovery, append resolution timestamp.

**Acceptance Criteria**
- No duplicate alerts for the same ongoing incident.
- Alert contains device identifier, time, and last error.
- Alerts page lists open + recent alerts, filterable by device.

### Story 6.4 — Monitoring dashboard widget
**Tasks**
- Dashboard widget: counts of up/down devices + latest alerts.

**Acceptance Criteria**
- Widget refreshes every 30s without full page reload.
- Clicking a device navigates to its detail/status history.

---

## Epic 7 — Cross-cutting Quality
*Can be tackled in parallel by any available agent AFTER the relevant epic is in place.*

### Story 7.1 — E2E smoke tests
**Acceptance Criteria**
- Scripted flow: login → create ticket → assign asset → generate report → logout runs green in CI.

### Story 7.2 — Observability
**Acceptance Criteria**
- Structured logs with request id; `/healthz` and `/readyz` endpoints; basic metrics (request count, latency, error rate).

### Story 7.3 — Security hardening pass
**Acceptance Criteria**
- Dependency audit clean; CSRF protection on state-changing forms; security headers set; secrets pulled from env, not code.

---

## Epic 8 — Integrations & MCP (post-MVP expansion)
*Makes CoDev the IT substrate for the agent economy. Meets customers where they live (Jira, Google Chat). Exposes every module programmatically so AI and automation partners can build on top.*

All 16 stories below are tracked as GitHub issues (`#182`–`#197`) and live on the project board with Priority + Size fields set.

### MVP Integrations — must ship together as the v1 Integrations release

#### Story 8.1 — MCP server exposing CoDev ITMS functionality — `[MVP · L]`
Tracks `#182`. Stand up an MCP server exposing tickets, assets, users, monitoring state, alerts, and reports as tools usable by any MCP-compatible client (Claude Desktop, Cursor, custom agents). Foundation for Stories 8.2 and everything downstream.

#### Story 8.2 — Bidirectional Jira ↔ CoDev ticket sync via MCP — `[MVP · L]`
Tracks `#183`. Two-way sync between Jira issues and CoDev tickets. Implemented agent-to-agent: CoDev's MCP server (Story 8.1) + the Atlassian MCP server orchestrated by a BullMQ reconciliation worker. Declarative field map, last-writer-wins conflict resolution. Depends on Story 8.1.

#### Story 8.3 — Google Chat notifications and slash commands — `[MVP · M]`
Tracks `#184`. New `GoogleChatNotificationProvider` behind the existing `NotificationService` interface. Inbound slash commands (`/ticket new`, `/ticket status`, `/asset assign`, `/ping`) via a signed webhook route that dispatches to existing service handlers. Independent — can ship in parallel with 8.1 and 8.2.

### P1 Enablement — ships right after MVP; unlocks enterprise segments

#### Story 8.4 — MCP OAuth 2.0 / OIDC authentication — `[P1 · M]`
Tracks `#185`. Replace the MVP API-key flow with OAuth 2.0 / OIDC for enterprise customers. Needed for SOC 2 and larger buyers.

#### Story 8.5 — MCP server per-tenant multi-tenancy — `[P1 · L]`
Tracks `#187`. Tenant isolation on the MCP server (per-tenant auth, per-tenant data scoping, per-tenant rate limits). Prerequisite for hosted SaaS.

#### Story 8.6 — Real-time Jira webhook ingest (replace polling) — `[P1 · M]`
Tracks `#193`. Upgrade the Jira sync from 30-second polling to webhook-driven real-time. Clear marketing/selling point and halves sync latency.

#### Story 8.7 — Google Workspace directory sync for identity resolution — `[P1 · M]`
Tracks `#195`. Resolve Google Chat callers to CoDev users automatically via Workspace directory. Removes the manual account-linking friction that blocks slash-command adoption.

### P2 Breadth & Polish — fill out the integration surface once the core holds

#### Story 8.8 — MCP resources and prompt templates (v2) — `[P2 · M]`
Tracks `#186`. Expose MCP resources + prompts (beyond tools) so agents can read context and use curated prompt templates.

#### Story 8.9 — API key management UI for MCP server — `[P2 · S]`
Tracks `#188`. Admin UI for provisioning, rotating, and revoking MCP API keys (MVP uses the admin API or seed script).

#### Story 8.10 — Streaming partial results for `run_report` tool — `[P2 · M]`
Tracks `#189`. Stream large reports over MCP instead of returning one blocking payload.

#### Story 8.11 — Jira multi-project sync support — `[P2 · M]`
Tracks `#190`. Sync tickets across multiple Jira projects simultaneously, with per-project field maps.

#### Story 8.12 — Jira attachment, subtask, and custom field sync — `[P2 · L]`
Tracks `#191`. Extend Jira sync beyond the core ticket fields to cover attachments, subtasks, and custom fields.

#### Story 8.13 — Jira field map configuration UI — `[P2 · M]`
Tracks `#192`. Visual editor for the Jira ↔ CoDev field map (MVP ships as a config file).

#### Story 8.14 — Sync CoDev assets and users to Jira — `[P2 · M]`
Tracks `#194`. Expand sync beyond tickets — push CoDev asset and user data into Jira custom fields / entities.

#### Story 8.15 — Google Chat interactive card buttons and dialogs — `[P2 · M]`
Tracks `#196`. Rich interactive cards (approve/deny buttons, resolution dialogs) — MVP ships with text-only ephemeral responses.

#### Story 8.16 — Google Chat DM notifications for assigned users — `[P2 · S]`
Tracks `#197`. Direct-message assignees instead of only posting to shared spaces.

---

## Parallelization Map

| Wave | Agent A | Agent B | Agent C | Agent D | Agent E |
|------|---------|---------|---------|---------|---------|
| 1 (blocking) | Epic 0 (solo) | — | — | — | — |
| 2 | Epic 1 | — | — | — | — |
| 3 (parallel) | Epic 2 | Epic 3 | Epic 4 | Epic 5 | Epic 6 |
| 4 | Epic 7 stories split across free agents | | | | |

Rules to stay out of each other's way:
- Each agent only edits files under its epic's module directory + its own tests.
- Any change to `shared/` (DB schema, auth, notifications) requires claiming it in `tasks/agent-collab.md` first.
- DB migrations are numbered sequentially; agents rebase before adding a new migration.
- If an agent needs a field from another module, expose it via that module's API, don't reach into its tables.
