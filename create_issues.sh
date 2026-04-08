#!/bin/bash

# Configuration
REPO="dev0nyn/it-management-system"
PROJECT_ID="PVT_kwHOEFdtiM4BT6mR"
STATUS_FIELD_ID="PVTSSF_lAHOEFdtiM4BT6mRzhBGOEU"
READY_OPTION_ID="61e4505c"

create_issue() {
  local title="$1"
  local tasks="$2"
  local ac="$3"

  local body="### Tasks
$tasks

### Acceptance Criteria
$ac"

  echo "Creating issue: $title"
  ISSUE_URL=$(gh issue create --repo "$REPO" --title "$title" --body "$body")
  
  if [ -n "$ISSUE_URL" ]; then
    echo "Issue created: $ISSUE_URL"
    # Add to project
    ITEM_ID=$(gh project item-add "$PROJECT_ID" --owner dev0nyn --url "$ISSUE_URL" --format json | jq -r '.id')
    
    if [ -n "$ITEM_ID" ]; then
      echo "Added to project, item ID: $ITEM_ID"
      # Set status to Ready
      gh project item-edit --id "$ITEM_ID" --project-id "$PROJECT_ID" --field-id "$STATUS_FIELD_ID" --single-select-option-id "$READY_OPTION_ID"
      echo "Status set to Ready"
    else
      echo "Failed to add to project"
    fi
  else
    echo "Failed to create issue"
  fi
}

# Story 0.1
create_issue "Story 0.1 — Repo scaffolding & tooling" \
"- [ ] Initialize backend project, frontend project, linter, formatter, CI config.
- [ ] Add \`docker-compose.yml\` for DB + app for local dev.
- [ ] Wire pre-commit hooks: lint, typecheck, test." \
"- \`docker compose up\` brings up DB + empty API + empty frontend.
- CI runs lint + typecheck + tests on PR and blocks on failure.
- README documents local setup in ≤ 5 commands."

# Story 0.2
create_issue "Story 0.2 — Database schema & migration framework" \
"- [ ] Choose migration tool; create initial migration with tables: \`users\`, \`roles\`, \`assets\`, \`asset_assignments\`, \`tickets\`, \`ticket_events\`, \`devices\`, \`device_status_log\`, \`alerts\`, \`audit_log\`.
- [ ] Seed script with one admin user." \
"- \`migrate up\` / \`migrate down\` both succeed on empty DB.
- Seed produces a loginable admin.
- ER diagram committed to \`docs/erd.md\`."

# Story 0.3
create_issue "Story 0.3 — Shared auth middleware & RBAC" \
"- [ ] JWT issue/verify helpers.
- [ ] Role-based middleware: \`admin\`, \`it_staff\`, \`end_user\`.
- [ ] Shared error envelope \`{ error: { code, message } }\`." \
"- Middleware rejects missing/expired/invalid tokens with 401.
- RBAC denies unauthorized roles with 403.
- Unit tests cover happy path + each rejection case."

# Story 0.4
create_issue "Story 0.4 — Shared notification service interface" \
"- [ ] Define \`NotificationService\` interface (email + in-app).
- [ ] Provide a no-op + console implementation for dev." \
"- Interface documented in \`shared/notifications/README.md\`.
- Tickets and Monitoring epics can import it without pulling a concrete implementation."

# Story 1.1
create_issue "Story 1.1 — Login endpoint + UI" \
"- [ ] \`POST /api/v1/auth/login\` → returns JWT on valid credentials, 401 otherwise.
- [ ] Login page with form, error display, redirect to dashboard on success.
- [ ] Rate-limit login attempts (per IP + per username)." \
"- Valid creds → 200 + token + redirect to \`/dashboard\`.
- Invalid creds → inline error \"Invalid username or password\" (no user enumeration).
- 5 failed attempts in 1 min → 429.
- Passwords stored hashed (bcrypt/argon2), never logged."

# Story 1.2
create_issue "Story 1.2 — Dashboard shell & navigation" \
"- [ ] Authenticated layout with nav: Users, Assets, Tickets, Reports, Monitoring, Logout.
- [ ] Hide nav items by role." \
"- Unauthenticated users hitting \`/dashboard\` are redirected to \`/login\`.
- End users do not see User Management or Reports nav items.
- Logout clears token and redirects to \`/login\`."

# Story 1.3
create_issue "Story 1.3 — Logout endpoint" \
"- [ ] \`POST /api/v1/auth/logout\` → invalidates refresh token / clears session." \
"- After logout, prior token cannot access protected routes.
- Audit log entry written."

# Story 2.1
create_issue "Story 2.1 — CRUD users (API)" \
"- [ ] \`GET/POST/PATCH/DELETE /api/v1/users\` with pagination + search.
- [ ] Enforce admin-only access." \
"- Admin can create, list (paginated), update, soft-delete users.
- Non-admin receives 403.
- Email uniqueness enforced; duplicate returns 409.
- Soft-deleted users cannot log in."

# Story 2.2
create_issue "Story 2.2 — User management UI" \
"- [ ] Users table with search, filter by role, create/edit modals, delete confirm." \
"- All CRUD actions from UI reflect in DB within one network round trip.
- Form validation matches API validation (required fields, email format).
- Destructive actions require confirmation."

# Story 2.3
create_issue "Story 2.3 — Audit logging for user changes" \
"- [ ] Write audit log row on create/update/delete with actor, target, before/after." \
"- Every mutation produces exactly one audit row.
- Audit rows are queryable by target user id."

# Story 3.1
create_issue "Story 3.1 — CRUD assets (API)" \
"- [ ] \`GET/POST/PATCH/DELETE /api/v1/assets\` with fields: tag, type, serial, status, purchase date, warranty." \
"- Asset tag is unique; duplicate returns 409.
- Status is a bounded enum (\`in_stock\`, \`assigned\`, \`repair\`, \`retired\`).
- IT staff + admin can mutate; end users read-only on assets assigned to them."

# Story 3.2
create_issue "Story 3.2 — Assign / unassign asset to user" \
"- [ ] \`POST /api/v1/assets/:id/assign\` body \`{ userId }\`; \`POST /api/v1/assets/:id/unassign\`.
- [ ] Create \`asset_assignments\` history row on each change." \
"- Assigning an already-assigned asset returns 409 unless \`force=true\`.
- Assignment history preserved across reassignments.
- Asset status transitions to \`assigned\` / back to \`in_stock\` automatically."

# Story 3.3
create_issue "Story 3.3 — Asset management UI" \
"- [ ] Assets table, create/edit form, assign dialog with user search." \
"- UI shows current holder and full assignment history.
- Assign dialog searches users via API (debounced).
- CSV import stub is out of scope for this epic."

# Story 4.1
create_issue "Story 4.1 — Submit ticket (API + UI)" \
"- [ ] \`POST /api/v1/tickets\` with fields: title, description, priority, category, optional asset id.
- [ ] Submit form for end users." \
"- Ticket persists with \`status=open\`, \`createdBy=currentUser\`.
- On create, \`NotificationService.notify('it_staff', …)\` fires exactly once.
- Validation: title ≤ 120 chars, description required."

# Story 4.2
create_issue "Story 4.2 — View & update ticket" \
"- [ ] \`GET /api/v1/tickets\` (filter by status, assignee, priority, mine).
- [ ] \`PATCH /api/v1/tickets/:id\` for status/assignee/comment.
- [ ] Ticket detail page with event timeline." \
"- End users see only their own tickets; IT staff see all.
- Every status/assignee change writes a \`ticket_events\` row.
- Closing a ticket requires a resolution note."

# Story 4.3
create_issue "Story 4.3 — Notify IT staff on new/updated tickets" \
"- [ ] Hook into \`NotificationService\` on create and on reassignment." \
"- New ticket → notification to all \`it_staff\` role members (or assigned group).
- Reassignment → notification to new assignee only.
- Notification failures are logged but do not fail the request."

# Story 5.1
create_issue "Story 5.1 — Report definitions" \
"- [ ] Implement reports: tickets by status, tickets by resolution time, assets by status, user activity.
- [ ] Date range + role filter parameters." \
"- Each report returns JSON with consistent envelope \`{ columns, rows, generatedAt }\`.
- Queries execute under 2s on seed data set (≥ 10k rows)."

# Story 5.2
create_issue "Story 5.2 — Report UI (display)" \
"- [ ] Reports page listing available reports; parameter form; table + simple chart render." \
"- Selecting a report and submitting parameters renders results without full page reload.
- Empty results show a clear \"No data\" state, not a blank table."

# Story 5.3
create_issue "Story 5.3 — Export (CSV + PDF)" \
"- [ ] \`GET /api/v1/reports/:id/export?format=csv|pdf\`." \
"- CSV opens cleanly in Excel/Sheets (UTF-8 BOM, quoted fields).
- PDF includes title, parameters, generated timestamp.
- Only admin + it_staff can export."

# Story 6.1
create_issue "Story 6.1 — Device registry" \
"- [ ] \`GET/POST/PATCH/DELETE /api/v1/devices\` with host/ip, type, check interval." \
"- IP/host uniqueness enforced.
- Admin-only mutations; it_staff read-only."

# Story 6.2
create_issue "Story 6.2 — Health check worker" \
"- [ ] Background worker polls each device per its interval (ICMP or TCP port check).
- [ ] Write \`device_status_log\` row per check." \
"- Worker survives restart (resumes from schedule, no duplicate checks).
- Failing check transitions device to \`down\` after N consecutive failures (configurable, default 3).
- Recovery transitions back to \`up\` on first success."

# Story 6.3
create_issue "Story 6.3 — Alerting on detected issue" \
"- [ ] On transition to \`down\`, call \`NotificationService\` once.
- [ ] Create row in \`alerts\` with device, first-seen, status.
- [ ] On recovery, append resolution timestamp." \
"- No duplicate alerts for the same ongoing incident.
- Alert contains device identifier, time, and last error.
- Alerts page lists open + recent alerts, filterable by device."

# Story 6.4
create_issue "Story 6.4 — Monitoring dashboard widget" \
"- [ ] Dashboard widget: counts of up/down devices + latest alerts." \
"- Widget refreshes every 30s without full page reload.
- Clicking a device navigates to its detail/status history."

# Story 7.1
create_issue "Story 7.1 — E2E smoke tests" \
"- [ ] Implement E2E smoke tests for the main flow." \
"- Scripted flow: login → create ticket → assign asset → generate report → logout runs green in CI."

# Story 7.2
create_issue "Story 7.2 — Observability" \
"- [ ] Implement structured logs, health endpoints, and basic metrics." \
"- Structured logs with request id; \`/healthz\` and \`/readyz\` endpoints; basic metrics (request count, latency, error rate)."

# Story 7.3
create_issue "Story 7.3 — Security hardening pass" \
"- [ ] Dependency audit, CSRF protection, security headers, env secrets." \
"- Dependency audit clean; CSRF protection on state-changing forms; security headers set; secrets pulled from env, not code."
