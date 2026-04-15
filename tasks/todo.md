# Story 4.1 — Submit ticket (API + UI)
Branch: `feat/story-4.1-submit-ticket`
Issue: dev0nyn/it-management-system#16

## Acceptance Criteria
- [x] Ticket persists with `status=open`, `createdBy=currentUser`
- [x] On create, `NotificationService.notify('it_staff', …)` fires exactly once
- [x] Validation: title ≤ 120 chars, description required

---

## Implementation Plan

### Layer 1 — DB Schema
- [x] Create `lib/db/schema/tickets.ts`
  - `ticketStatusEnum`: open | in_progress | resolved | closed
  - `ticketPriorityEnum`: low | medium | high | urgent
  - `tickets` table: id, title (≤120), description, priority, category, assetId (nullable), status (default open), createdBy (FK users), assigneeId (nullable FK users), createdAt, updatedAt
- [x] Update `drizzle.config.ts` to glob both schema files (`./lib/db/schema/*.ts`)

### Layer 2 — Migration
- [x] Create `lib/db/migrations/0001_tickets.sql`
  - CREATE TYPE ticket_status ENUM (idempotent)
  - CREATE TYPE ticket_priority ENUM (idempotent)
  - CREATE TABLE tickets (idempotent)

### Layer 3 — Repository
- [x] Create `lib/tickets/repository.ts`
  - `create(data)` — inserts a ticket row, returns full row
  - `findItStaffUsers()` — SELECT id, email, name FROM users WHERE role = 'it_staff'

### Layer 4 — Service
- [x] Create `lib/tickets/service.ts`
  - `createTicket(data, createdBy)`:
    1. Insert ticket via repository
    2. Fetch IT staff via repository
    3. Call `createNotificationService().notify(recipients, notification)` exactly once
    4. Notification failures: log error, do not throw
    5. Return created ticket

### Layer 5 — API Route
- [x] Create `app/api/v1/tickets/route.ts`
  - `export const runtime = "nodejs"`
  - `POST`: authenticate via `getSession(req)`, reject 401 if no session
  - Validate body with zod: title (min 1, max 120), description (min 1), priority (enum), category (min 1), assetId (uuid optional)
  - Call `service.createTicket(body, session.userId)`
  - Return 201 `{ data: ticket }`

### Layer 6 — UI
- [x] Create `components/tickets/ticket-submit-dialog.tsx`
  - Dialog with form: title, description (textarea), priority (Select), category (text)
  - Uses `authFetch` to POST `/api/v1/tickets`
  - Loading state on submit button
  - On success: close dialog + callback (to allow board refresh in 4.2)
  - On error: inline error display
- [x] Update `app/(main-pages)/tickets/page.tsx`
  - Import `TicketSubmitDialog`
  - Wire "New Ticket" button to open dialog state
  - Pass `onSuccess` callback (no-op for now; real refresh in 4.2)

### Layer 7 — Tests
- [x] `lib/tickets/__tests__/service.test.ts` — unit tests for createTicket
  - Mocks: repository, notificationService
  - Cases: happy path, notification failure doesn't throw

### Pre-PR Checklist
- [x] `pnpm run typecheck` passes
- [x] `pnpm run lint` passes
- [x] `pnpm run test:unit` passes

---

## Review Notes
(filled in after completion)
