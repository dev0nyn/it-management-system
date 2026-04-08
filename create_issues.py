import subprocess
import json
import time

PROJECT_ID = "PVT_kwHOEFdtiM4BT6mR"
OWNER = "dev0nyn"
REPO = "dev0nyn/it-management-system"
STATUS_FIELD_ID = "PVTSSF_lAHOEFdtiM4BT6mRzhBGOEU"
READY_OPTION_ID = "61e4505c"

stories = [
    {
        "title": "Story 0.1 — Repo scaffolding & tooling",
        "tasks": [
            "Initialize backend project, frontend project, linter, formatter, CI config.",
            "Add `docker-compose.yml` for DB + app for local dev.",
            "Wire pre-commit hooks: lint, typecheck, test."
        ],
        "ac": [
            "`docker compose up` brings up DB + empty API + empty frontend.",
            "CI runs lint + typecheck + tests on PR and blocks on failure.",
            "README documents local setup in ≤ 5 commands."
        ]
    },
    {
        "title": "Story 0.2 — Database schema & migration framework",
        "tasks": [
            "Choose migration tool; create initial migration with tables: `users`, `roles`, `assets`, `asset_assignments`, `tickets`, `ticket_events`, `devices`, `device_status_log`, `alerts`, `audit_log`.",
            "Seed script with one admin user."
        ],
        "ac": [
            "`migrate up` / `migrate down` both succeed on empty DB.",
            "Seed produces a loginable admin.",
            "ER diagram committed to `docs/erd.md`."
        ]
    },
    {
        "title": "Story 0.3 — Shared auth middleware & RBAC",
        "tasks": [
            "JWT issue/verify helpers.",
            "Role-based middleware: `admin`, `it_staff`, `end_user`.",
            "Shared error envelope `{ error: { code, message } }`."
        ],
        "ac": [
            "Middleware rejects missing/expired/invalid tokens with 401.",
            "RBAC denies unauthorized roles with 403.",
            "Unit tests cover happy path + each rejection case."
        ]
    },
    {
        "title": "Story 0.4 — Shared notification service interface",
        "tasks": [
            "Define `NotificationService` interface (email + in-app).",
            "Provide a no-op + console implementation for dev."
        ],
        "ac": [
            "Interface documented in `shared/notifications/README.md`.",
            "Tickets and Monitoring epics can import it without pulling a concrete implementation."
        ]
    },
    {
        "title": "Story 1.1 — Login endpoint + UI",
        "tasks": [
            "`POST /api/v1/auth/login` → returns JWT on valid credentials, 401 otherwise.",
            "Login page with form, error display, redirect to dashboard on success.",
            "Rate-limit login attempts (per IP + per username)."
        ],
        "ac": [
            "Valid creds → 200 + token + redirect to `/dashboard`.",
            "Invalid creds → inline error \"Invalid username or password\" (no user enumeration).",
            "5 failed attempts in 1 min → 429.",
            "Passwords stored hashed (bcrypt/argon2), never logged."
        ]
    },
    {
        "title": "Story 1.2 — Dashboard shell & navigation",
        "tasks": [
            "Authenticated layout with nav: Users, Assets, Tickets, Reports, Monitoring, Logout.",
            "Hide nav items by role."
        ],
        "ac": [
            "Unauthenticated users hitting `/dashboard` are redirected to `/login`.",
            "End users do not see User Management or Reports nav items.",
            "Logout clears token and redirects to `/login`."
        ]
    },
    {
        "title": "Story 1.3 — Logout endpoint",
        "tasks": [
            "`POST /api/v1/auth/logout` → invalidates refresh token / clears session."
        ],
        "ac": [
            "After logout, prior token cannot access protected routes.",
            "Audit log entry written."
        ]
    },
    {
        "title": "Story 2.1 — CRUD users (API)",
        "tasks": [
            "`GET/POST/PATCH/DELETE /api/v1/users` with pagination + search.",
            "Enforce admin-only access."
        ],
        "ac": [
            "Admin can create, list (paginated), update, soft-delete users.",
            "Non-admin receives 403.",
            "Email uniqueness enforced; duplicate returns 409.",
            "Soft-deleted users cannot log in."
        ]
    },
    {
        "title": "Story 2.2 — User management UI",
        "tasks": [
            "Users table with search, filter by role, create/edit modals, delete confirm."
        ],
        "ac": [
            "All CRUD actions from UI reflect in DB within one network round trip.",
            "Form validation matches API validation (required fields, email format).",
            "Destructive actions require confirmation."
        ]
    },
    {
        "title": "Story 2.3 — Audit logging for user changes",
        "tasks": [
            "Write audit log row on create/update/delete with actor, target, before/after."
        ],
        "ac": [
            "Every mutation produces exactly one audit row.",
            "Audit rows are queryable by target user id."
        ]
    },
    {
        "title": "Story 3.1 — CRUD assets (API)",
        "tasks": [
            "`GET/POST/PATCH/DELETE /api/v1/assets` with fields: tag, type, serial, status, purchase date, warranty."
        ],
        "ac": [
            "Asset tag is unique; duplicate returns 409.",
            "Status is a bounded enum (`in_stock`, `assigned`, `repair`, `retired`).",
            "IT staff + admin can mutate; end users read-only on assets assigned to them."
        ]
    },
    {
        "title": "Story 3.2 — Assign / unassign asset to user",
        "tasks": [
            "`POST /api/v1/assets/:id/assign` body `{ userId }`; `POST /api/v1/assets/:id/unassign`.",
            "Create `asset_assignments` history row on each change."
        ],
        "ac": [
            "Assigning an already-assigned asset returns 409 unless `force=true`.",
            "Assignment history preserved across reassignments.",
            "Asset status transitions to `assigned` / back to `in_stock` automatically."
        ]
    },
    {
        "title": "Story 3.3 — Asset management UI",
        "tasks": [
            "Assets table, create/edit form, assign dialog with user search."
        ],
        "ac": [
            "UI shows current holder and full assignment history.",
            "Assign dialog searches users via API (debounced).",
            "CSV import stub is out of scope for this epic."
        ]
    },
    {
        "title": "Story 4.1 — Submit ticket (API + UI)",
        "tasks": [
            "`POST /api/v1/tickets` with fields: title, description, priority, category, optional asset id.",
            "Submit form for end users."
        ],
        "ac": [
            "Ticket persists with `status=open`, `createdBy=currentUser`.",
            "On create, `NotificationService.notify('it_staff', …)` fires exactly once.",
            "Validation: title ≤ 120 chars, description required."
        ]
    },
    {
        "title": "Story 4.2 — View & update ticket",
        "tasks": [
            "`GET /api/v1/tickets` (filter by status, assignee, priority, mine).",
            "`PATCH /api/v1/tickets/:id` for status/assignee/comment.",
            "Ticket detail page with event timeline."
        ],
        "ac": [
            "End users see only their own tickets; IT staff see all.",
            "Every status/assignee change writes a `ticket_events` row.",
            "Closing a ticket requires a resolution note."
        ]
    },
    {
        "title": "Story 4.3 — Notify IT staff on new/updated tickets",
        "tasks": [
            "Hook into `NotificationService` on create and on reassignment."
        ],
        "ac": [
            "New ticket → notification to all `it_staff` role members (or assigned group).",
            "Reassignment → notification to new assignee only.",
            "Notification failures are logged but do not fail the request."
        ]
    },
    {
        "title": "Story 5.1 — Report definitions",
        "tasks": [
            "Implement reports: tickets by status, tickets by resolution time, assets by status, user activity.",
            "Date range + role filter parameters."
        ],
        "ac": [
            "Each report returns JSON with consistent envelope `{ columns, rows, generatedAt }`.",
            "Queries execute under 2s on seed data set (≥ 10k rows)."
        ]
    },
    {
        "title": "Story 5.2 — Report UI (display)",
        "tasks": [
            "Reports page listing available reports; parameter form; table + simple chart render."
        ],
        "ac": [
            "Selecting a report and submitting parameters renders results without full page reload.",
            "Empty results show a clear \"No data\" state, not a blank table."
        ]
    },
    {
        "title": "Story 5.3 — Export (CSV + PDF)",
        "tasks": [
            "`GET /api/v1/reports/:id/export?format=csv|pdf`."
        ],
        "ac": [
            "CSV opens cleanly in Excel/Sheets (UTF-8 BOM, quoted fields).",
            "PDF includes title, parameters, generated timestamp.",
            "Only admin + it_staff can export."
        ]
    },
    {
        "title": "Story 6.1 — Device registry",
        "tasks": [
            "`GET/POST/PATCH/DELETE /api/v1/devices` with host/ip, type, check interval."
        ],
        "ac": [
            "IP/host uniqueness enforced.",
            "Admin-only mutations; it_staff_read-only."
        ]
    },
    {
        "title": "Story 6.2 — Health check worker",
        "tasks": [
            "Background worker polls each device per its interval (ICMP or TCP port check).",
            "Write `device_status_log` row per check."
        ],
        "ac": [
            "Worker survives restart (resumes from schedule, no duplicate checks).",
            "Failing check transitions device to `down` after N consecutive failures (configurable, default 3).",
            "Recovery transitions back to `up` on first success."
        ]
    },
    {
        "title": "Story 6.3 — Alerting on detected issue",
        "tasks": [
            "On transition to `down`, call `NotificationService` once.",
            "Create row in `alerts` with device, first-seen, status.",
            "On recovery, append resolution timestamp."
        ],
        "ac": [
            "No duplicate alerts for the same ongoing incident.",
            "Alert contains device identifier, time, and last error.",
            "Alerts page lists open + recent alerts, filterable by device."
        ]
    },
    {
        "title": "Story 6.4 — Monitoring dashboard widget",
        "tasks": [
            "Dashboard widget: counts of up/down devices + latest alerts."
        ],
        "ac": [
            "Widget refreshes every 30s without full page reload.",
            "Clicking a device navigates to its detail/status history."
        ]
    },
    {
        "title": "Story 7.1 — E2E smoke tests",
        "tasks": [],
        "ac": [
            "Scripted flow: login → create ticket → assign asset → generate report → logout runs green in CI."
        ]
    },
    {
        "title": "Story 7.2 — Observability",
        "tasks": [],
        "ac": [
            "Structured logs with request id; `/healthz` and `/readyz` endpoints; basic metrics (request count, latency, error rate)."
        ]
    },
    {
        "title": "Story 7.3 — Security hardening pass",
        "tasks": [],
        "ac": [
            "Dependency audit clean; CSRF protection on state-changing forms; security headers set; secrets pulled from env, not code."
        ]
    }
]

def run_cmd(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command: {' '.join(cmd)}")
        print(f"Stdout: {result.stdout}")
        print(f"Stderr: {result.stderr}")
        return None
    return result.stdout

def create_issue(story):
    body = ""
    if story["tasks"]:
        body += "### Tasks\n"
        for task in story["tasks"]:
            body += f"- [ ] {task}\n"
        body += "\n"
    
    if story["ac"]:
        body += "### Acceptance Criteria\n"
        for ac in story["ac"]:
            body += f"- {ac}\n"
    
    cmd = [
        "gh", "issue", "create",
        "--repo", REPO,
        "--title", story["title"],
        "--body", body
    ]
    
    output = run_cmd(cmd)
    if output:
        issue_url = output.strip()
        print(f"Created issue: {issue_url}")
        return issue_url
    return None

def add_to_project(issue_url):
    cmd = [
        "gh", "project", "item-add", PROJECT_ID,
        "--owner", OWNER,
        "--url", issue_url,
        "--format", "json"
    ]
    output = run_cmd(cmd)
    if output:
        data = json.loads(output)
        item_id = data.get("id")
        print(f"Added to project, item ID: {item_id}")
        return item_id
    return None

def set_status_ready(item_id):
    cmd = [
        "gh", "project", "item-edit",
        "--id", item_id,
        "--field-id", STATUS_FIELD_ID,
        "--project-id", PROJECT_ID,
        "--option-id", READY_OPTION_ID
    ]
    run_cmd(cmd)
    print(f"Status set to Ready for item {item_id}")

def main():
    for story in stories:
        issue_url = create_issue(story)
        if issue_url:
            item_id = add_to_project(issue_url)
            if item_id:
                set_status_ready(item_id)
        # Small sleep to avoid rate limiting if necessary, though 26 issues should be fine.
        time.sleep(1)

if __name__ == "__main__":
    main()
