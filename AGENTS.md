# AGENTS.md

# Home Bakery Management Platform — Agent Operating Guide

## 1. Purpose

This repository contains the Home Bakery Management Platform.

The product is a mobile-first internal management application for home bakers.

Primary stack:

- Next.js
- TypeScript
- Supabase PostgreSQL
- Supabase Auth
- Supabase RLS
- Supabase Storage
- PostgreSQL-backed background jobs
- Capacitor for Android
- PWA for web/iOS browser usage
- Zod
- React Hook Form
- OpenAPI / Swagger
- BugSnag
- SonarQube

The authoritative product and architecture specification is:

`home-bakery-management-platform-plan.md`

**The plan is the source of truth.**

Before implementing any feature or making an architectural decision, read the relevant section of the plan.

---

# 2. Non-Negotiable Rules

## 2.1 Follow the plan

Do not invent new product requirements.

Do not add features simply because they are technically interesting.

Do not replace an approved architecture with another architecture without explicit user approval.

If the plan says a feature is Phase 2, do not implement it during Phase 1.

If the plan explicitly says a feature is not required, do not add it.

If something is ambiguous, stop and record the ambiguity/blocker instead of guessing.

---

## 2.2 No scope creep

The user explicitly requires:

> Never divert or build something new outside the plan.

Therefore:

- No unnecessary features.
- No speculative microservices.
- No unnecessary Redis.
- No unnecessary third-party services.
- No unnecessary image uploads.
- No unnecessary database tables.
- No unnecessary abstractions.
- No premature optimization.
- No feature creep disguised as "best practice."

Production hardening is allowed when it protects functionality already specified by the plan.

---

## 2.3 User-Mandated Development Rules

- **Git Author & Commits**: Commit using `jaFFa <jafakash.14@gmail.com>`. Commit after every feature or change with small, short, professional commit messages.
- **Testing Mandate**: Write test cases for backend, database, and E2E on each step to avoid later problems.
- **Local Environment**: Use Docker and local Supabase for local development. Envs must be documented in `.env.example` and configured in `.env.local`.

---

# 3. Required Agent Workflow

Every development task must follow this sequence.

```text
1. Read AGENTS.md
2. Read the relevant plan sections
3. Inspect the existing implementation
4. Identify dependencies and affected modules
5. Plan the smallest implementation that satisfies the plan
6. Implement
7. Validate
8. Run relevant tests/checks
9. Review for scope creep
10. Update changelog.md
11. Record blockers if any
12. Commit the completed change
```

Never skip the plan review.

---

# 4. Before Coding

Before touching code, answer internally:

- What exact requirement am I implementing?
- Which plan section defines it?
- Which module owns it?
- Which database tables are affected?
- Which API/service/repository layers are affected?
- Does RLS need to be considered?
- Does this affect audit logging?
- Does this affect error handling?
- Does this affect background jobs?
- Does this affect the PWA or Capacitor Android layer?
- Are there existing shared constants/types/validation schemas that should be reused?

If the answer requires a new feature that is not in the plan, do not implement it.

---

# 5. Architecture Rules

Use the approved modular-monolith architecture.

```text
UI
 ↓
API / Controller
 ↓
Validation
 ↓
Service
 ↓
Repository
 ↓
Supabase / PostgreSQL
```

Controllers must remain thin.

Services contain business logic.

Repositories contain database access.

Validation must happen at the API boundary and important business rules must also be enforced server-side.

Do not put business logic directly into UI components.

---

# 6. Module Boundaries

Keep domain modules separate.

```text
modules/
├── auth/
├── customers/
├── products/
├── orders/
├── inventory/
├── expenses/
├── payments/
├── receipts/
├── notifications/
├── analytics/
├── audit/
└── menu/
```

Do not create additional modules unless the plan requires them.

---

# 7. Multi-Tenancy

Every bakery-owned record must be tenant-scoped.

Use:

```text
bakery_id
```

Supabase RLS is mandatory.

Never rely only on frontend filtering for tenant isolation.

Every change must be evaluated for:

- authenticated user
- role
- bakery ownership
- RLS
- service-layer authorization

Baker A must never be able to access Baker B's business data.

---

# 8. Roles

The approved roles are:

```text
BAKER
DEV
```

Do not introduce additional roles unless explicitly requested.

---

# 9. Authentication

Registration requires:

- phone number
- email
- password

Phone and email must be unique per account as specified by the plan.

Account confirmation uses the centralized mail abstraction.

Password reset uses the approved temporary-password flow.

Never:

- log plaintext passwords
- log temporary passwords
- expose authentication secrets
- store tokens in logs

---

# 10. Error Handling

Use the centralized error architecture.

```text
AppError
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── NotFoundError
├── ConflictError
├── BusinessRuleError
├── ExternalServiceError
└── InternalServerError
```

Use:

```text
shared/constants/errors.ts
```

for centralized error codes/messages.

Do not invent random error strings inside individual controllers.

API errors must follow the standard response contract.

Never expose:

- stack traces
- SQL errors
- Supabase internal errors
- secrets
- tokens
- passwords

to users.

---

# 11. Logging and Audit

Use structured application logging.

Use request correlation IDs.

Audit business mutations using the central audit logger.

Audit important actions including:

- customer changes
- product changes
- order changes
- payment-status changes
- inventory changes
- expense changes
- account/security changes

Do not log sensitive credentials.

---

# 12. Orders

The approved order workflow is:

```text
Add Order
→ Select Customer
→ Add Items
→ Modify Quantities
→ Delivery
→ Extra Charges / Discount
→ Payment
→ Bill Preview
→ Confirm
→ Create Order
→ View / Share Bill
```

An order draft is not a final order.

The server must:

- validate the request
- re-check product data
- re-check inventory
- calculate totals
- create the order transactionally
- create order items
- apply inventory changes
- create audit information
- enqueue post-commit work where required

Use idempotency for critical mutations.

---

# 13. Money

Never use floating-point arithmetic for monetary values.

Use integer minor units such as paise.

Server-side calculations are authoritative.

The frontend must never be trusted as the source of truth for order totals.

---

# 14. Inventory

Inventory is ledger-based.

Use the approved transaction types:

```text
STOCK_IN
ORDER_RESERVATION
ORDER_CONSUMPTION
ADJUSTMENT
WASTAGE
RETURN
```

Inventory operations must be concurrency-safe.

Do not implement a simplistic read → calculate → write flow that can oversell stock.

---

# 15. Receipts

Receipts are **not stored**.

They are generated on demand.

Correct model:

```text
Confirmed Order
      ↓
Generate receipt when requested
      ↓
Preview / PDF
      ↓
Share / Download
```

Do not create a receipt-history table.

Do not permanently store generated receipt PDFs.

Do not add a receipt storage bucket.

Do not create a ReceiptWorker whose purpose is permanent receipt storage.

Receipt generation may be performed on demand or asynchronously only when required for the immediate request; the resulting artifact must not become persistent receipt storage.

---

# 16. File Upload Policy

User-uploaded files are intentionally restricted.

The **only user-uploaded file allowed by the current plan is the bakery logo**.

Rules:

- Maximum size: 500 KB.
- Validate file size server-side.
- Validate file type/content server-side.
- Logo is scoped to the bakery.
- Only one active bakery logo exists.
- When a new logo is successfully uploaded, delete the previous logo.
- Do not delete the old logo before the new upload has been validated and successfully stored.
- Never expose arbitrary storage paths.
- Do not introduce image uploads for products, customers, orders, expenses, receipts, menu items, or users unless the plan is explicitly changed.

---

# 17. Background Jobs

Use PostgreSQL-backed jobs initially.

Do not add Redis just because a queue is needed.

Approved queue model:

```text
jobs
----
id
type
payload
status
attempts
run_at
locked_at
locked_by
last_error
created_at
completed_at
```

Workers must support:

- atomic job claiming
- retries
- backoff
- stale-job recovery
- failure/dead-letter visibility
- idempotent processing

Approved workers include:

- NotificationWorker
- AnalyticsWorker
- MenuBuildWorker
- CleanupWorker

Use the queue for email delivery and other operations where the plan specifies asynchronous processing.

---

# 18. Notifications

Notifications should be worker-based.

Android uses Capacitor native capabilities where appropriate.

Web/PWA uses browser capabilities where supported.

Do not make the web/PWA dependent on Android-only APIs.

Use a platform abstraction rather than scattering Capacitor calls throughout the application.

---

# 19. PWA and Capacitor

The application uses:

```text
Next.js
├── Web / PWA
└── Capacitor Android
```

iOS is delivered as PWA/browser usage.

Android is the native packaged application distributed through Google Play.

Keep business logic shared.

Do not create a separate Android frontend.

Use a native capability abstraction for:

- notifications
- sharing
- haptics
- filesystem
- deep links
- app lifecycle
- other approved native capabilities

Only add native capabilities when they support existing product requirements.

---

# 20. Dashboard

The dashboard is operational.

Priority:

1. What needs attention now?
2. Pending orders.
3. Pending payments.
4. Today's orders/revenue.
5. Low stock.
6. Business snapshot.

Pending orders default to due-date ordering.

Do not turn the dashboard into a large analytics page.

Analytics belong in the Analytics module/page.

---

# 21. UI/UX

The application is mobile-first.

Primary target sizes:

- 360px
- 390px
- 414px

Support responsive tablet and desktop layouts.

Approved visual directions:

- Clean Bakery
- Peach Bakery

Use shared design tokens.

Do not randomly introduce new themes or visual systems.

Accessibility is mandatory:

- semantic HTML
- labels
- keyboard navigation
- focus handling
- sufficient contrast
- screen-reader support
- accessible errors
- adequate touch targets

---

# 22. Validation

Use:

- Zod
- React Hook Form

Validate on the client for UX.

Validate again on the server for correctness and security.

The backend is authoritative.

---

# 23. Database

Use Supabase migrations.

Never manually modify production schema outside the migration system.

Use:

- foreign keys
- unique constraints
- check constraints where useful
- indexes based on actual query patterns

Important tenant/query indexes must follow the plan.

---

# 24. API

Use the approved REST-style API structure.

Keep API responses consistent.

Success:

```json
{
  "success": true,
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "requestId": "req_..."
  }
}
```

Critical mutation endpoints must be safe against duplicate submissions.

---

# 25. OpenAPI / Swagger

Maintain OpenAPI documentation for the API.

Swagger UI should be developer-only/protected in production.

Keep documentation synchronized with the actual API.

---

# 26. Testing

Implement tests according to the plan.

## Unit

Cover:

- order totals
- discounts
- charges
- inventory calculations
- status transitions
- validation
- error mapping

## Integration

Cover:

- order creation
- inventory
- authentication
- RLS
- notifications
- database constraints

## E2E

Cover the critical journey:

```text
Login
→ Customer
→ Product
→ Stock
→ Create Order
→ Bill
→ Share/Download
→ Update Status
```

Include tenant-isolation tests.

---

# 27. Quality Gates

The intended CI flow is:

```text
Push / PR
→ Install
→ Lint
→ Format Check
→ Type Check
→ Unit Tests
→ Integration Tests
→ E2E
→ Build
→ SonarQube
→ Quality Gate
→ Staging
→ Smoke Test
→ Production
```

BugSnag is used for runtime monitoring after the application reaches the appropriate hardening stage.

---

# 28. Impeccable

Impeccable is a design-quality tool.

It must not be allowed to change product scope.

Use it to improve:

- UX
- accessibility
- responsive behavior
- visual hierarchy
- typography
- layout
- consistency
- polish

Do not use it as a reason to invent new product features.

Recommended initial flow:

```text
/impeccable init
/impeccable shape the first screen
/impeccable audit the implemented screen
/impeccable polish the implemented screen
```

Use the detailed command guidance in the project's workflow notes.

---

# 29. Changelog Requirement

Every development change must be recorded in:

`changelog.md`

Each entry should contain:

- date
- change
- affected module
- reason
- validation
- blocker status
- migration notes if applicable

Example:

```markdown
## 2026-09-21

### Added
- Added customer repository.

### Changed
- Added tenant-scoped customer queries.

### Validation
- Typecheck passed.
- Unit tests passed.

### Blockers
- None.
```

Do not rewrite historical entries.

Append new entries.

---

# 30. Blocker Log

If development encounters a blocker, record it in `changelog.md` immediately.

A blocker must contain:

```markdown
### Blocker

- Status: OPEN
- Area:
- Description:
- What was attempted:
- Why it is blocked:
- Required decision/input:
- Temporary workaround:
```

Do not silently work around an architectural blocker.

Do not permanently choose an alternative architecture without user approval.

When a blocker is resolved, append a resolution entry.

---

# 31. Scope-Change Protocol

If the implementation appears to require something outside the plan:

1. Stop implementation of that part.
2. Record the issue in `changelog.md`.
3. Explain why the current plan is insufficient.
4. Ask for an explicit decision.
5. Do not implement the new feature until approved.

This is especially important for:

- new database tables
- new external services
- new user-facing features
- new roles
- new upload types
- new authentication methods
- new infrastructure
- replacing Supabase
- introducing Redis
- introducing microservices

---

# 32. Definition of Done

A task is complete only when:

- The requirement matches the plan.
- Architecture boundaries are respected.
- Validation exists.
- Error handling exists.
- Authorization/RLS is correct.
- Audit logging is added where required.
- Sensitive data is protected.
- Tests/checks are run.
- No unrelated feature was added.
- `changelog.md` is updated.
- Open blockers are recorded.
- The change is ready for a commit.

---

# 33. Final Agent Rule

When uncertain:

```text
Do not guess.
Do not expand scope.
Do not invent.
Read the plan.
Record the blocker.
Ask for the decision.
```

The plan wins over agent preferences.
The user's explicit requirements win over generic "best practices".
