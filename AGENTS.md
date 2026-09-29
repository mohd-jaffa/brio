# AGENTS.md

# Home Bakery Management Platform — Agent Operating Guide

## 1. Purpose

This repository contains the Home Bakery Management Platform.

The app is called **Brio** — *"Made by you. Managed simply."* (the user, 2026-09-28). The code says `brio` too: the package, the cookies, the keys a device stores, the caches and the local Supabase project. A screen, an email or a bill says Brio, through `UI_TEXT.appName`.

The product is a mobile-first internal management application for **home businesses** — home bakers first, and also hamper makers, florists and gift makers (plan §139.1).

**Words.** Anything a user reads says **business**, not *bakery*: "Business details", "your business". Internal names keep `bakery` — the `bakeries` table, `bakery_id`, `bakeryId` — because renaming them would touch every table, policy and module for no visible gain (plan §139.11.1). New code does not mix the two: `bakery` in identifiers, "business" in copy.

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

Kept for later, in no phase now (plan §139.18): OpenAPI / Swagger, BugSnag and
SonarQube.

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

Use a **Feature-Based Architecture**. Code is grouped by domain feature slices rather than technical layers, with everything shared by more than one feature living in `src/lib`, `src/components`, `src/hooks` or `src/constants`.

```text
src/
├── app/                      # Next.js routes only — thin; no business logic
│   ├── (auth)/               # sign in, register, reset, change password, confirm
│   └── api/                  # REST endpoints (§24)
├── assets/                   # app-owned art: illustrations/, plates/ (§16)
├── components/
│   ├── nav/                  # AppShell, MoreSheet
│   └── ui/                   # the shared kit: button, text-field, form-sheet,
│                             # list-screen, page-header, status-pill, …
├── constants/                # messages, statuses, navigation, roles, routes, …
├── features/<domain>/
│   ├── api.ts                # server-side data access (pure functions)
│   ├── api.client.ts         # the endpoints the browser calls
│   ├── components/           # PascalCase, this feature's screens and sheets
│   ├── hooks/                # useXxx.ts
│   └── types.ts
├── hooks/                    # shared hooks (useDisclosure, useDebouncedValue)
├── proxy.ts                  # the signed-in/signed-out gate (§9)
└── lib/
    ├── api/                  # route handler, response envelope, browser client
    ├── audit/                # the central audit logger (§11)
    ├── dates/                # the bakery's calendar
    ├── errors/               # AppError and the kind factories (§10)
    ├── format/               # currency, date
    ├── jobs/                 # the PostgreSQL job queue (§17)
    ├── mail/                 # the mail abstraction
    ├── query/                # API route keys and the SWR read/write hooks
    ├── supabase/             # server clients, tenant records, column helpers
    ├── theme/                # ThemeProvider
    └── validation/           # Zod schemas (§22)
```

- Each feature encapsulates its own UI components, hooks, API fetchers, types, and decomposed domain logic functions.
- Avoid monolithic `service.ts` or `repository.ts` classes. Use focused, pure functions for domain logic.
- **A feature's data functions take a `Tenant`** (`src/lib/supabase/tenant.ts`): the caller's client, the business and the acting user, as `withBakeryRoute` builds them from the session. They never take `(client, bakeryId)` separately (plan §133.7 G1).
- **`src/lib` never imports from `src/features`.** Features compose lib, not the other way round.
- **Strict Constant Centralization**: No magic strings or inline error messages are allowed anywhere in the app. Use `src/constants/messages.ts` for all UI text, validation feedback, and error codes, and `src/constants/statuses.ts` for every status, method and category the database also knows.
- **Use the shared UI kit.** A screen does not restyle a button, a field, a list state or a sheet. If something is needed twice, it belongs in `src/components/ui`.
- Component files in `src/components/ui` are kebab-case; a feature's own components are PascalCase.

---

# 6. Feature Boundaries

Keep domain features separate inside `src/features/`.

```text
features/
├── auth/
├── business/        # the business profile and its logo (plan §139.11.2, §56)
├── customers/
├── products/
├── orders/
├── inventory/
├── expenses/
├── payments/
├── receipts/
├── notifications/
├── analytics/
├── dashboard/
└── menu/
```

Do not create additional features unless the plan requires them.

Auditing and the job queue are not domain features — they are infrastructure every feature uses, and live in `src/lib/audit` and `src/lib/jobs`.

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
USER   the business owner — every right BAKER had
DEV    unchanged; never inherits business data
```

`BAKER` became `USER` in Phase 2 (tracker R2.2, plan §139.11.1,
`0010_roles_user.sql`); a screen calls it "Owner". A role is never read from,
or written to, Supabase `user_metadata` — users can edit their own metadata
(BUG-17, `0009_role_out_of_metadata.sql`).

**DEV has the developer console** (`/admin`, plan §139.11.16) and nothing else:
read-only, behind `withDevRoute` (`DEVELOPER_ROLES`), showing the accounts and
the audit trail. A developer owns no business (`0028_developer_accounts.sql`),
is sent to `/admin` from every business screen, and is added from the Supabase
dashboard, never by registering. The console shows only what the app already
keeps.

Do not introduce additional roles unless explicitly requested.

---

# 9. Authentication

Registration requires (plan §139.11.2):

- your name
- mobile number — the sign-in credential
- email
- password
- business name
- city and business address
- a catch phrase — optional

Sign-in stays by mobile number.

Phone and email must be unique per account as specified by the plan.

Account confirmation uses the centralized mail abstraction.

Password reset uses the approved temporary-password flow.

## Sessions

The session lives in **HttpOnly cookies** set by the server, never in `localStorage` and never in a JavaScript variable:

- `src/features/auth/cookies.ts` is the only place that names, builds or reads them. They are `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` outside development.
- Signing in, refreshing and confirming an email all answer through `withSessionRoute` (`src/features/auth/route.ts`), so the cookies are set in one place and the response body carries the profile, never a token.
- A route reads the caller's token with `readAccessToken` (`src/features/auth/guard.ts`), which accepts the cookie or an `Authorization: Bearer` header.
- The browser attaches nothing. `src/lib/api/client.ts` refreshes the session once and retries when a request is refused for an expired token.
- `src/proxy.ts` keeps a signed-out visitor out of the app's screens. It gates on cookie presence only; **it is not an authorization check** — that is the route guard and RLS.
- **The page arrives knowing the session.** The root layout reads the cookies on the server (`readInitialSession`, `src/features/auth/session.server.ts`) and hands `AuthProvider` the session view (never a token), `null` for signed out, or `undefined` when only the browser can settle it. A signed-in screen is drawn in the page's own HTML, and a signed-out visitor is never answered with a 401. It decides nothing about access: the API and RLS still do.
- **The proxy renews an expired access token** before a screen is drawn (`src/features/auth/renew.ts`), through `cookies.ts` like the refresh route, so the server can draw the screen signed in. A refused refresh clears the cookies and sends the visitor to sign in.
- **Every signed-in screen is an `AppScreen`** (`src/components/nav/AppScreen.tsx`): the page declares its first reads — `queries` for `useApiQuery`, `pages` for `useApiPages` — keyed by the same routes the hooks ask for, each made as its API route makes it (`routeQuery`, the route's own schema). The screen arrives with its data (`ServerData`), and the hooks do not ask again for it on mount.
- **Account boundaries are a new page.** Signing in, signing out and confirming an email go through `loadPage` (`src/lib/navigation/url.ts`), and `AuthProvider` keeps each account's reads in a cache of its own. Nothing of one account can be shown to the next.

## Authorization

- `assertRole` has no default. A route names the roles it serves, and `withBakeryRoute` serves `BUSINESS_ROLES` (`USER` only) unless told otherwise — DEV does not inherit access to business data (plan §5).
- A baker owing a password change is refused everywhere but the screen that replaces it, on the server (`assertPasswordChanged`) as well as in the browser (`RequireAuth`).

## Privacy and deleting an account

The privacy policy is `/privacy` (R8.10), open without a session. Its words are
`PRIVACY_POLICY` (`src/constants/privacy.ts`). **When the app starts keeping
something new, or a new service sees it, the policy and its `updated` date
change with it.** An owner deletes their account from Settings
(`/settings/delete-account`, `DELETE /api/auth/account`). That takes the
sign-in number, the email and the password twice, and `delete_account`
(`0030_account_deletion.sql`, service role only) removes everything in one
transaction. A new table owned by a business must cascade from `bakeries`, or
deleting an account will fail.

Never:

- log plaintext passwords
- log temporary passwords
- expose authentication secrets
- store tokens in logs
- return a token in an API response body

---

# 10. Error Handling

There is **one error class**, `AppError` (`src/lib/errors/AppError.ts`). It carries:

- `code` — the catalogue code the API returns, whose wording lives in `src/constants/messages.ts`
- `kind` — the plan's taxonomy, which fixes the HTTP status
- `traceId` — the id the logs carry

The taxonomy is expressed as factory functions in `src/lib/errors/kinds.ts`; nothing calls the constructor directly:

```text
validationError        → 400
authenticationError    → 401
authorizationError     → 403
notFoundError          → 404
conflictError          → 409
businessRuleError      → 422
externalServiceError   → 502
internalError          → 500
```

Use `ERROR_MESSAGES` in `src/constants/messages.ts` for centralized error codes/messages.

Do not invent random error strings inside individual controllers.

API errors must follow the standard response contract.

Never expose:

- stack traces
- SQL errors
- Supabase internal errors
- secrets
- tokens
- passwords

to users. A driver failure is mapped through `fromSupabaseError`, which never lets the driver's own text reach a screen.

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

Every audit row records **who** acted: `logActionSafe(tenant, entry)` takes the
business and the acting user from the tenant, never from the entry. The trail
is **written by the server only**, through the service role; a signed-in user
may read their business's rows and insert none (BUG-20,
`0011_audit_writes.sql`).

Do not log sensitive credentials.

---

# 12. Orders

The approved order workflow is **items first** (plan §139.2 Q11, §139.10):

```text
New order
→ Items — the product grid, or a custom item (name + amount)
→ Order details — customer (a saved one, a new one made on the spot, or Guest);
  delivery, filled from the customer and editable; quantities; charges and discounts
→ Payment — unpaid, paid in full, or part paid with the amount
→ View bill (an estimate — nothing is stored) · Share
→ Place order
→ View / share the bill
```

An order draft is not a final order. **A customer is optional:** an order may be
for a Guest, and Guest orders are reported as Guest sales (plan §139.11.3).

Statuses move only as the transition table allows (`ORDER_STATUS_TRANSITIONS`,
plan §139.11.8), and stock follows them: placing reserves, delivering turns the
reservation into consumption, cancelling releases it. An open order may take
any other open status — on, or back after a mistake — or go straight to
Delivered or Cancelled; those two are final, and ask first.

**An open order can be changed** (plan §139.11.13, `PUT /api/orders/{id}`,
`update_order`): its items, customer, handover, charges and discounts, and
notes — never its payments. A line already on it keeps the price it was
ordered at. The reservation follows each product's change in quantity, checked
against stock; the total may not come to less than has been paid.

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

Use integer minor units such as paise. `src/lib/money.ts` is the only place that converts: `rupeesToPaise` reads the digits a person typed rather than multiplying by 100, and `sumPaise` adds. Screens show money through `formatPaise` (`src/lib/format/currency.ts`) and never divide by 100 themselves.

An order's totals come from one formula, `src/features/orders/totals.ts`, used by the checkout screen's preview and by the server when it creates the order.

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

Where it lives (`0008_business_profile.sql`, `src/features/business`): the
private `business-logos` bucket, at `bakeries/{bakery_id}/logo/{logo id}`, which
its policies open only to that business. It is sent as the request body to
`POST /api/business/logo`, typed by its own first bytes (never the browser's
word), and read back only through `GET /api/business/logo` by its signed-in
owner. `bakeries` is SELECT-only for a client: the profile and the logo
reference change through `update_business_profile` and `set_business_logo`,
which act only for the owner.
- Do not introduce image uploads for products, customers, orders, expenses, receipts, menu items, or users unless the plan is explicitly changed.

**App-owned artwork is not an upload.** The illustration library (`artwork/illustrations/`, shipped from `src/assets/illustrations/`, plan §139.11.10), the photographic plates (`src/assets/plates/`, §139.11.12) the profile pictures — nine animals and 24 people (`src/assets/avatars/`, §139.11.14) — the brand's marks (`src/assets/brand/`, the installed app's icons) and the launch splash's scene (`src/assets/splash/`, §139.11.19) ship with the app. A user **chooses** an illustration for a product or an expense category, and a profile picture for their own account — a new account is given one at random (`0026_profile_avatars`, `0029_people_avatars`); nothing they choose is stored except its key. The profile pictures are for the owner's account only: a customer keeps their initials. Their masters are committed; the design references in `design-references/` are not, and the plates and the profile pictures are built from them.

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

The worker is its own Node.js process (`src/worker.ts`, `npm run worker`), run
beside the app; it registers every worker's handlers and drains the queue
through `claim_next_job` (FOR UPDATE SKIP LOCKED) and `recover_stale_jobs`
(`0012_job_claiming.sql`). A job type is named in `JOB_TYPES`
(`src/constants/jobs.ts`), never as a string at the call site.

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

**For now no worker runs** (the user, 2026-09-27; plan §139.11.15). `WORKER_ENABLED`
(`src/constants/jobs.ts`) is `false`, as `public.worker_enabled()` is
(`0027_no_worker.sql`), and a test keeps the two equal. While it is false:

- **Email is sent by the request that asks for it**: the confirmation at
  registration and its Resend, and a new email's link
  (`deliverAccountConfirmation`, `deliverEmailChange`). A failed send never
  undoes what it was for — the account, the waiting address — and is logged;
  a Resend reports it (`asMailFailure`).
- **Notifications are only for orders due soon and overdue**, looked for by the
  app as the bell or the inbox is read (`checkDueOrders`,
  `take_due_order_notices`), once a minute at most per business.
- **Every other notification is held back** at the queue
  (`jobs_hold_notifications`), and the app queues none.
- **`npm run worker` refuses to start.**

Nothing of the worker is removed. New work that belongs on the queue is still
written for it, with its inline path beside it under the same switch.
Running a worker again is `WORKER_ENABLED = true`, a migration making
`worker_enabled()` true, and the worker run beside the app.

---

# 18. Notifications

Notifications should be worker-based. For now none is, and only orders due
soon and overdue are told of (§17, plan §139.11.15).

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

**The Android app** (Phase 8, plan §139.17): Capacitor 8 loading the hosted app,
`in.brio.app`, Android only — there is no iOS app; iPhones use the installable
web app. Where things live:

```text
src/lib/native/        the only code that talks to Capacitor: each capability's web and
                       Android halves. Screens import @/lib/native; ESLint refuses
                       @capacitor/* anywhere else.
android/               the native project (Gradle, manifest, icons, splash), committed;
                       what Capacitor generates into it is git-ignored.
capacitor.config.ts    the app id, name, hosted address (ANDROID_APP_URL) and plugins.
.capacitor/shell/      the pages bundled into the app (offline), built by
                       `npm run android:sync`; never committed.
```

The native layer holds only capabilities something calls (plan §139.17.2):
`share` and `saveFile` (the bill), the back button (`NativeSetup`), and
`isAndroidApp` / `hasPlugins`. Every Android half checks its plugin is in the
installed build and falls back to the web half: the app loads the hosted web
app, so a deploy can be newer than the install.

`npm run android:sync` builds the bundled pages and syncs; `npm run
android:open` opens Android Studio. The upload key and the build number come
from CI (`BRIO_UPLOAD_KEYSTORE*`, `BRIO_VERSION_CODE`), never the repository.

**The PWA** (Phase 7, plan §139.11.17) is the manifest (`src/app/manifest.ts`),
the icons (`scripts/app-icons.mjs`), and a service worker (`public/sw.js`). The
worker keeps only the app's own hashed static files and an offline page fetched
without cookies. **It never caches a screen or an API answer**: nothing of one
account may be kept for the next. It is set up in a built app only.
**Install app** lives with the other menus (More, the sidebar) and is hidden
inside the installed app (`useInstallApp`).

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

Approved visual directions (plan §139.4):

- **Golden** — replaces Clean; a stored `clean` choice reads as Golden
- **Peach**

Use the shared design tokens in `src/app/globals.css` — `background`, `surface`,
`sunken`, `border`, `text`, `text-muted`, `primary`, `primary-soft`, `accent`,
`action` and the status colours. A screen never picks a colour itself.

Do not randomly introduce new themes or visual systems.

**Every screen ships phone, tablet and desktop together** (plan §139.9), and
respects the safe areas: every inset flows through `--safe-top/right/bottom/left`,
and heights use `dvh`, never `vh` (plan §139.8).

**Reporting an outcome.** The result of an action — saved, created, recorded,
refused, failed — is a **response card** (`useResponse()`, plan §139.6), on the
web and in the Android app alike. What stays inline: field validation, beside
the field; and a screen that could not load (`ScreenNotice` with Retry). An
error card shows the API's message and its `requestId`, never raw text.
**An action that cannot be undone asks first** on a confirm card
(`respond.confirm`): marking an order Delivered or Completed, cancelling it,
deleting, clearing an order being built, and signing out (`useSignOut`).

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

**Strict Architectural Rule**:
All validation schemas, Zod definitions, and database constraints *MUST* be centralized inside `src/lib/validation/schemas/`. That includes the **form** schemas a sheet or screen parses with (`productFormSchema`, `expenseFormSchema`, `orderFormSchema`, …) — a component never declares a schema of its own.
Use `src/lib/validation/primitives.ts` for reusable schema components (e.g. `paiseText`, `optionalEmail`) bound to `src/constants/messages.ts`.

Each schema exports both shapes: `XxxInput` (`z.input`, what a form or client sends) and `XxxPayload` (`z.output`, what the server works with). A payload is parsed **once**, at the route boundary, and the feature's `api.ts` takes the parsed value.

**Input hygiene** (plan §139.7). Every text input is normalised by one set of
primitives — trimmed, whitespace collapsed, zero-width and control characters
removed — and every field is bounded so it fits its column. Money is read the
way people write it ("₹1,500") and never through a float. **Passwords are never
altered, not even trimmed.** Every message comes from `VALIDATION_MESSAGES`: a
schema never falls back to Zod's own English, and `index.test.ts` in
`tests/unit/lib/validation` fails if one does.

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

Migration files must follow sequential naming:

```text
0001_create_bakeries
0002_create_users
0003_create_customers
...
```

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

**Kept for later** (the user, 2026-09-28; plan §139.18). There is no OpenAPI
document and no Swagger UI, and none is added until the user brings it back.
Meanwhile the API's contract is its route schemas (`src/lib/validation/schemas/`)
and the route table in plan §139.13.

When it is taken up (plan §119 – §120): Swagger UI is developer-only or
protected in production, and the document is kept in step with the API.

---

# 26. Testing

Implement tests according to the plan.

Every test lives under **`tests/`**, and `src/` holds only code that ships (plan §139.16):

```text
tests/
├── unit/       mirrors src/ exactly — src/lib/money.ts → tests/unit/lib/money.test.ts
├── db/         database contracts; later, integration tests against local Supabase
├── contract/   route-shape contracts
├── e2e/        Playwright browser journeys
└── support/    setup, auth stubs (`@tests/support/auth`), fixtures
```

- **One test file, one subject.** A unit test's path is its subject's path with `src/` replaced by `tests/unit/` and `.test` before the extension. A test that covers several modules is split, one file per module.
- **Imports and mocks use `@/` paths**, never `./` or `../`: they survive moves, and `vi.mock("@/features/x/api.client")` still intercepts a component that imports `../api.client`.
- **`scripts/check-test-paths.mjs` runs before every `npm test`** and fails on a unit test whose subject no longer exists, or a test left inside `src/`.

## Frontend UI
- 100% test case coverage is mandatory for all frontend UI components, custom hooks, and client services.
- Use React Testing Library and Vitest.
- Mock the API Client Service layer for component tests.
- Assert through roles and labels, not class names — a test that cannot find a control by its accessible name is telling you the control is not accessible.

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
→ Quality Gate
→ Staging
→ Smoke Test
→ Production
```

**SonarQube and BugSnag are kept for later** (the user, 2026-09-28; plan
§139.18). The pipeline runs without them, and errors go to the server's own
structured logs (§11).

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
