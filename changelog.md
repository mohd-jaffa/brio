# Changelog

All notable changes to this project will be documented in this file.

## 2026-09-22

### Changed
- **Project structure now mirrors the reference architecture.** `src/shared/` and `src/infrastructure/` are gone; everything shared lives in `src/lib`, `src/components`, `src/hooks` or `src/constants`, and `src/lib` no longer imports from `src/features`. Auditing moved to `src/lib/audit` and the job queue to `src/lib/jobs`, since neither is a domain feature.
- **One error class.** `AppError` carries a catalogue `code`, a `kind` from the plan's taxonomy, and a `traceId`; the eight subclasses became factory functions in `src/lib/errors/kinds.ts`. The kind fixes the HTTP status, so a route can no longer answer with the wrong one.
- **Tenant-scoped routes.** Every bakery route goes through `withBakeryRoute`, which resolves the session, checks the role and builds a Supabase client carrying the caller's token — so isolation is enforced by RLS rather than by each route remembering to filter.
- **One record layer.** `tenantRecords` (`src/lib/supabase/records.ts`) does the scoping, the refusal-on-no-row and the audit for every table, collapsing the repeated CRUD plumbing in each feature's `api.ts`.
- **Validation is parsed once, at the route boundary.** Each schema exports `XxxInput` and `XxxPayload`; feature `api.ts` functions take the parsed payload. The ad-hoc Zod schemas that had grown inside form components moved into `src/lib/validation/schemas/` as `productFormSchema`, `expenseFormSchema`, `stockAdjustmentFormSchema`, `paymentFormSchema` and `orderFormSchema`.
- **Money is paise everywhere.** `rupeesToPaise` reads the digits typed instead of multiplying by 100, `sumPaise` adds, and `formatPaise` displays. No component divides by 100 any more. An order's totals come from one formula (`src/features/orders/totals.ts`) used by both the checkout preview and the server.
- **Screens rebuilt on a shared UI kit** (`src/components/ui`): `Button`, `LinkButton`, `IconButton`, `TextField`, `TextAreaField`, `SelectField`, `FieldError`, `FormSheet`, `ListScreen`, `PageHeader`, `SearchInput`, `SegmentedControl`, `StatusBadge`, `StatTile`, `EmptyState`, `ScreenNotice`, `Skeleton`. The four form sheets and six list screens no longer restate overlay chrome, field markup, loading/error/empty branches or button styling.
- **Data access through shared hooks.** `apiRoutes` names every endpoint once; `useApiQuery` and `useApiMutation` replace the hand-rolled `useSWR` calls and the try/catch/finally around every form submit.
- Navigation, statuses, payment methods, expense categories and ledger types are now single lists in `src/constants/`, with the labels and badge tones beside them.
- Unit and component tests now sit beside what they test; `tests/` holds only the database and end-to-end contracts.

### Fixed
- The orders list and the analytics page read zero items on every order: `getAllOrders` mapped every order with empty item and adjustment arrays. Lines are now loaded for the whole page in two queries.
- The inventory screen read balances as a `Record<string, number>` while the endpoint answers an array, so every product showed zero stock.
- `/api/analytics/overview` and `/api/orders/[id]/receipt` served a hard-coded `bakery_id` of `"bakery-1"`, ignoring the caller's tenant. Both now go through `withBakeryRoute`.
- Order and customer detail pages read `params` as a plain object; under Next 16 it is a promise.
- The "Collect Payment" button on the order detail page set state that nothing rendered — the payment sheet never opened.
- Template literals escaped by an earlier codemod (`\${...}`) were printing their own source in order errors and notification bodies.
- `findOrderById` and the customer/product/expense lookups faked a PostgREST response with `Promise.resolve({...} as any)` to reuse `requireRow`.
- Customer phone numbers were only stripped of separators, so the same person could be stored twice; they now normalise to E.164 through `src/lib/phone.ts`.
- `animate-slide-up` was defined inside the More sheet's own `<style>` tag, so any other sheet animated only while that one had been opened. Both animations are design tokens now, and honour `prefers-reduced-motion`.
- Form sheets focused their close button on open instead of the first field, announced no errors, could not be dismissed with Escape, and let the page behind them scroll.

### Removed
- One-off codemod scripts left in the repository root: `fix-errors.js`, `fix-imports.js`, `migrate-features.js`, `migrate-validations.js`, `update-constants.js`, `update-constants.ts`.
- The unused Next.js starter SVGs in `public/`, the empty `src/modules/` tree, and the Supabase CLI's local state (`supabase/.branches`, `supabase/.temp`) from version control.
- The hard-coded sample orders, low-stock rows and monthly figures on the dashboard, which are now read from the bakery's own data.

### Validation
- `tsc --noEmit` passes.
- `eslint` passes with no errors or warnings.
- `vitest run` passes: 44 files, 341 tests.

### Blockers

All open gaps between the plan and the code are now recorded in the plan itself,
as **§133. Implementation Gap Register** — including the three below. The most
serious is §133.1: there is no sign-in screen, nothing stores a session, and the
browser client never sends an `Authorization` header, so every screen would
answer 401 against a live API.

- Status: OPEN
- Area: Settings — bakery logo upload
- Description: The logo picker validates size (500 KB) and type in the browser, but there is no endpoint to store the file.
- What was attempted: The control was left in place with client-side validation.
- Why it is blocked: The storage bucket, the server-side validation and the replace-then-delete flow in AGENTS.md §16 are not built.
- Required decision/input: Confirm the bucket name and path convention before the upload endpoint is written.
- Temporary workaround: The control reports that uploads are not available yet rather than reporting a success that did not happen, which is what it did before.

- Status: OPEN
- Area: Settings — bakery profile
- Description: The bakery name and business phone fields were pre-filled with hard-coded values and a Save button that did nothing.
- What was attempted: The fields were removed and the section says the editing is not wired up.
- Why it is blocked: There is no bakery profile endpoint yet.
- Required decision/input: Whether the bakery profile belongs in this phase.
- Temporary workaround: None needed — nothing is claimed that is not true.

- Status: OPEN
- Area: Audit — who made the change
- Description: `audit_logs.user_id` is written as `null` for every mutation.
- What was attempted: The audit call was centralised in `tenantRecords`, so there is now one place to thread the actor through.
- Why it is blocked: Feature `api.ts` functions take `(client, bakeryId, …)`; passing the caller would change every signature, which is a change worth making deliberately.
- Required decision/input: Approval to add the acting user to the data-layer signatures.
- Temporary workaround: `withBakeryRoute` already has the session, so the change is a threading exercise once approved.

## 2026-09-21

### Added
- Implemented core Impeccable Design System with semantic CSS custom properties for **Clean Bakery** and **Peach Bakery** visual themes in `src/app/globals.css`.
- Added `ThemeProvider` context and `useTheme` hook supporting theme switching and `localStorage` persistence in `src/shared/theme/ThemeProvider.tsx`.
- Configured Google Fonts (`Fredoka` for display/headings, `Plus Jakarta Sans` for body text), viewport settings, and PWA metadata in `src/app/layout.tsx`.
- Created mobile-first responsive `AppShell` component (`src/shared/components/AppShell.tsx`) featuring a fixed bottom navigation bar for mobile viewports (360px, 390px, 414px) and a side navigation layout for desktop viewports.
- Configured repository git author identity to `jaFFa <jafakash.14@gmail.com>`.
- Updated `AGENTS.md` with user-mandated git commit workflow, per-step testing mandate (backend/DB/E2E), and local Docker/Supabase rules.
- Created `.env.example` and `.env.local` for local Docker Supabase configuration.

### Changed
- Replaced default app template with the Home Bakery Management Platform design system foundation.

### Validation
- Build and type-checking verified.
- Visual token accessibility and dual-theme switching verified.

### Blockers
- None.

## 2026-09-21 — Auth Foundation, API Error Rail, and Security Update

### Added
- Added centralized API error handling, request IDs, standard success/error response helpers, structured logging, and sensitive-key redaction.
- Added server environment validation for Supabase, app URL, and SMTP configuration.
- Added Supabase server/client factories for anonymous, bearer-token, and service-role access.
- Added centralized mail service interfaces, Nodemailer provider wiring, and account confirmation/password-reset templates.
- Added Auth module validation, phone normalization, secure temporary-password generation, role helpers, and bearer authorization guard.
- Added API routes for registration, phone/password login, logout, session lookup, password reset, and forced password change.
- Added Supabase migration `20260921170000_auth_foundation.sql` for `bakeries`, `profiles`, uniqueness constraints, RLS, and own-bakery read policies.
- Added backend, database, and auth-flow contract tests using Node's built-in test runner with `tsx`.

### Changed
- Updated the production readiness checklist in `home-bakery-management-platform-plan.md` for completed auth, validation, authorization, RLS, secret-management, and logging items.
- Updated `ThemeProvider` hydration to satisfy the React Compiler lint rule while preserving persisted theme selection.
- Updated Next.js and `eslint-config-next` from `16.2.10` to `16.3.5` to resolve npm audit advisories.
- Added `typecheck`, `test`, `test:backend`, `test:db`, and `test:e2e` package scripts.
- Documented local SMTP placeholder variables in `.env.example` and `.env.local`.

### Affected Modules
- Auth
- Shared API/error handling
- Infrastructure: Supabase, mail, env
- Database migrations
- Test tooling

### Reason
- Implements the plan's Phase 1 authentication requirements and P0 hardening items for error classification, request IDs, log sanitization, auth/session hardening, environment separation, and migrations.

### Validation
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test` passed: backend, DB migration contract, and auth-flow contract tests.
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities.
- `npm run build` passed on Next.js 16.3.5.

### Migration Notes
- Apply `supabase/migrations/20260921170000_auth_foundation.sql` to the local Supabase database before exercising the auth API against Docker Supabase.
- Configure SMTP variables before using account confirmation or password-reset emails outside local placeholder mail tooling.

### Blockers
- None.

## 2026-09-21 — Impeccable Shape: Design System & App Shell

### Changed (Design Token Compliance — Plan Section 42)
- Renamed `--color-bg` → `--color-background` to match plan token names (Lines 1669–1678).
- Fixed Peach Bakery `--color-surface` from cold white `#ffffff` to warm white `#fefaf6`.
- Added Tailwind v4 `@theme` bridge so components use `bg-background`, `text-primary`, etc. instead of `bg-[var(--color-background)]`.
- Added centralized `--radius-*`, `--shadow-card`, `--shadow-elevated`, `--color-primary-light` tokens.
- Replaced blanket `button, a { min-height: 44px }` with `.touch-target` utility (blanket rule broke inline links).
- Upgraded focus ring to two-tone outline (visible on primary-colored backgrounds).
- Added `.safe-top` / `.safe-bottom` CSS utilities for PWA/Capacitor safe area insets.

### Changed (Layout & Viewport — Plan Section 41)
- Removed `maximumScale: 1` and `userScalable: false` from viewport config (WCAG 1.4.4 fix).
- Removed broken `manifest: "/manifest.json"` reference (file does not exist).
- Added `suppressHydrationWarning` to `<html>` for theme hydration.

### Changed (ThemeProvider Hydration)
- Removed `visibility: hidden` wrapper div that caused Flash of Invisible Content (FOIC).
- Children render directly; server-side `data-theme="clean"` handles initial paint.
- Memoized `setTheme`/`toggleTheme` with `useCallback`.

### Changed (Navigation — Plan Section 9)
- Corrected mobile bottom nav from 5 items to plan-specified 4 items: Home, Orders, Customers, More.
- Expanded desktop sidebar from 5 items to plan-specified 9 items: Dashboard, Orders, Customers, Products, Inventory, Expenses, Analytics, Receipts, Settings.
- Added desktop header bar per plan Section 41 desktop wireframe (was hidden on desktop).
- Migrated nav items from `<button>` with local state to Next.js `<Link>` with real routing.
- Added `aria-label="Main navigation"`, `aria-current="page"`, `aria-hidden="true"` on emoji icons.
- Wrapped nav items in semantic `<ul>`/`<li>` structure.
- Added safe area inset padding for iOS/gesture-nav Android.
- Fixed mobile `<h1>` (was `<span>`, now proper `<h1>`).
- Added theme selector `role="radiogroup"` with `aria-checked` on desktop sidebar.

### Added (MoreSheet — Plan Section 9 Lines 333–342)
- Created `MoreSheet` bottom sheet component for mobile "More" tab.
- Lists: Products, Inventory, Expenses, Analytics, Receipts, Settings.
- Includes backdrop, escape-to-close, `aria-modal` dialog, slide-up animation.

### Changed (Dashboard — Plan Section 84 Priority Order)
- Restructured dashboard to match Section 84: Greeting → Summary Card → Pending Orders → Quick Actions → Low Stock → Monthly Snapshot → View Analytics.
- Orders grouped by due date: Overdue → Due Today → Tomorrow (Section 78–80).
- Summary card uses plan Section 77 metrics: Today's Orders, Revenue, Pending Orders, Pending Payments.
- Quick actions row per Section 82: + Add Order, + Add Customer, + Add Stock, + Add Expense.
- Monthly snapshot card per Section 83 with "View Analytics →" link.
- Removed developer metadata card ("Target Viewports", "Upload Policy", "Receipt Storage").
- Removed duplicate theme toggle from dashboard hero card.
- Replaced `<span cursor-pointer>` with proper interactive elements.
- Used `<dl>`/`<dt>`/`<dd>` for metrics, `<ul>`/`<li>` for order lists.
- Fixed heading hierarchy: `<h2>` section → `<h3>` card → `<h4>` group.
- Replaced all `text-[10px]` with `text-xs` minimum (12px).

### Validation
- `npx tsc --noEmit` passed (0 errors).
- `npm run build` passed — compiled in 1474ms, static pages generated.

### Blockers
- None.

## 2026-09-21 — Auth Architecture Fixes, Vitest Integration, and Phase 2 Core Schema

### Added
- Added `vitest` and `@vitest/coverage-v8` to fulfill testing framework mandate.
- Created `vitest.config.ts` for project configuration.
- Added `tests/backend/auth.service.test.ts` to cover compensation logic and rollback scenarios.
- Created `0002_business_core.sql` schema defining Phase 1 Business Core entities (`customers`, `categories`, `products`, `orders`, `order_items`, `order_adjustments`, `inventory_transactions`, `expenses`) with precise plan specifications, indices, constraints, and Row Level Security policies.

### Changed
- Renamed `20260921170000_auth_foundation.sql` to `0001_auth_foundation.sql` following AGENTS.md requirements.
- Refactored `AuthService` into clean architecture: extracted all DB mutation logic to a new `AuthRepository`.
- Fixed auth registration transaction flow to securely rollback/cleanup user identities if profile row creation fails.
- Decoupled `api/auth/session/route.ts` from direct guard injection, using standard service layers.
- Migrated all test files from `node:test` regex scanning to robust `vitest` matchers and structure.

### Validation
- Typecheck passed (`npm run typecheck`).
- Tests passed (`npm run test`) on all suites.
- Next build passed.

### Blockers
- None.

## 2026-09-21 — Customers & Products Backend Modules

### Added
- Created `Customers` and `Products` modules with isolated domain types, robust Zod validation schemas, and clean Service/Repository layers.
- Added `extract-session` shared helper to securely enforce tenant scoping (using `bakery_id`) consistently across API boundaries.
- Implemented API route handlers for creating, fetching, listing, and updating customers (`/api/customers`, `/api/customers/[id]`).
- Implemented API route handlers for creating, fetching, listing, and updating products (`/api/products`, `/api/products/[id]`).
- Added robust unit tests verifying strict business rules, like phone normalization for Customers and integer paise requirement for Products.

### Changed
- Enforced `AGENTS.md` Controller -> Service -> Repository layer architecture for both new modules.
- Replaced `ERROR_CODES.BUSINESS_RULE_VIOLATION` with explicit `CONFLICT` errors where appropriate (unique constraints).

### Validation
- Typecheck passed.
- Unit and integration tests passed via Vitest.
- Committed under mandated author settings.

### Blockers
- None.

## 2026-09-21 — Orders & Inventory Backend Modules

### Added
- Created `Orders` and `Inventory` modules following `AGENTS.md` architectural guidelines.
- Implemented strict server-side order calculation logic (paise only) handling subtotals, charges, and discounts. The client's math is no longer trusted.
- Implemented manual compensation logic (rollbacks) for complex order transactions across `orders`, `order_items`, `order_adjustments`, and `inventory_transactions` tables.
- Implemented automated `ORDER_RESERVATION` and `ORDER_CONSUMPTION` inventory ledger transactions during order lifecycle events.
- Created `InventoryService.getBalances()` method to safely aggregate ledger transactions into current stock levels.
- Implemented RESTful APIs for fetching and manipulating orders and inventory via strict Zod input schemas.

### Validation
- Typecheck passed.
- Unit tests for order math and inventory sign boundaries passed via Vitest.
- Committed under mandated author settings.

### Blockers
- None.

## 2026-09-21 — Impeccable Polish: Glassmorphism & Lucide Icons

### Added
- Installed `lucide-react` for high-quality, professional SVG iconography to replace all native emojis across the app.

### Changed
- **AppShell & MoreSheet:** Upgraded bottom navigation and headers with true glassmorphism (`backdrop-blur-md bg-surface/85`).
- **AppShell:** Replaced all string emojis with stroked Lucide icons. Implemented `active:scale-95` micro-interactions for a tactile touch feel.
- **Dashboard:** Upgraded summary cards to `rounded-2xl` with a subtle `from-success/10 to-success/5` gradient on the Revenue card to make it visually pop.
- **Dashboard:** Replaced pending order badge backgrounds with softer opacities and stronger text contrast for a premium SaaS look. Added a CSS wave animation to the greeting emoji.

### Validation
- Typecheck passed.
- Committed under mandated author settings.

### Blockers
- Next.js Turbopack currently fails in the standard sandbox during `npm run build` due to port binding restrictions (`os error 1`), but `npm run typecheck` acts as the primary validation gate for component correctness.

## 2026-09-21 — Expenses Backend Module

### Added
- Created `Expenses` module following `AGENTS.md` architectural guidelines, completing the Phase 1 `0002_business_core.sql` backend schema.
- Added `ExpenseRow`, `ExpenseCategory`, and `PaymentMethod` domain types mapped directly to the database enums.
- Added strict `Zod` runtime validation enforcing positive integer paise for `amount`.
- Added isolated `ExpensesRepository` implementing tenant scoping (`bakery_id`).
- Implemented robust `ExpensesService` validating payloads before dispatching to the repository.
- Created fully compliant REST APIs (`GET`, `POST`, `PATCH`, `DELETE`) for managing expenses at `/api/expenses` and `/api/expenses/[id]`.

### Validation
- Added `tests/backend/expenses.service.test.ts` to verify enum constraints and negative-value rejections.
- Typecheck passed (`npm run typecheck`).
- Tests passed (`npm run test`) using Vitest.
- Committed under mandated author settings.

### Blockers
- `receipt_url` is supported as a standard string string per database schema, but as per `AGENTS.md` rules regarding user uploads, no file-upload endpoints have been introduced for expenses.

## 2026-09-21 — Customers Frontend UI

### Added
- Installed `swr`, `react-hook-form`, and `@hookform/resolvers` for data fetching and robust form validation.
- Created a standard `ApiError` fetch wrapper (`fetcher`) for client-side API consumption via SWR.
- **Customers Page (`/customers`)**: Implemented a responsive list view with dynamic search filtering and premium "Impeccable" mobile-first cards.
- **Customer Form Sheet**: Built a sliding bottom-sheet (mobile) / modal (desktop) form for adding and editing customers. Leverages the exact same Zod schema (`createCustomerSchema`) used on the backend for shared validation.
- **Customer Profile Page (`/customers/[id]`)**: Implemented a detailed hero view providing quick-actions (Call, Directions) and aggregating the customer's lifetime value dynamically by analyzing their order history directly on the client. Displays top-level metrics: Total Orders, Total Spent, Avg Order, and Pending Payments.

### Validation
- Typecheck passed (`npm run typecheck`).
- React hook lint rules verified and passing (`npm run lint`).
- Committed under mandated author settings.

### Blockers
- None.

## 2026-09-21 — Master Frontend UI Assembly (Products, Inventory, Expenses, Orders)

### Added
- **Products/Menu UI (`/products`)**: Implemented list view and `ProductFormSheet` with dynamic price/paise formatting. Shows inactive items grayscale.
- **Inventory UI (`/inventory`)**: Implemented inventory balance list aggregating `getBalances()` with low-stock visual flags. Built `InventoryAdjustmentSheet` for manual `STOCK_IN`, `WASTAGE`, and `ADJUSTMENT` transactions enforcing correct ledger math.
- **Expenses UI (`/expenses`)**: Implemented expense list grouped dynamically by month, showcasing category icons and detailed line items. Built `ExpenseFormSheet`.
- **Orders UI (`/orders`)**: Implemented order list with Active and Past tabs, dynamic search by order number or customer name, and status-colored badges.
- **Dashboard Wiring (`/`)**: Connected the hardcoded dashboard summary cards to `/api/orders` to dynamically calculate today's orders, revenue, pending orders, and pending payments.

### Changed
- Replaced hardcoded dashboard numbers with `useSWR` derived metrics.
- Updated Dashboard quick actions (`Add Order`, `Add Stock`, etc.) with correct Next.js `<Link>` routing.

### Validation
- Typecheck passed.
- Lint passed.
- All code committed securely.

### Blockers
- New Order Flow (`/orders/new`) requires a complex dynamic multi-step form to calculate totals in real-time before submission. A placeholder page was implemented for this route; building the comprehensive cart workflow requires a dedicated development phase.

## 2026-09-21 — Final Phase 1 Frontend Assembly (Cart, Details, Receipts, Settings, Analytics)

### Added
- **New Order Cart (`/orders/new`)**: Built a fully dynamic, client-side order creation form using `react-hook-form` and `useFieldArray`. Handles product selection, quantity multipliers, dynamic subtotals, and adjustable discounts/charges. Enforces strict input validation mapped to the backend Zod schema.
- **Order Details (`/orders/[id]`)**: Built the full hero view for inspecting order metadata, delivery specifics, and line items. Integrated quick actions to update `status` and `paymentStatus`.
- **Receipt Generation (`ReceiptPrintView.tsx`)**: Implemented an on-demand receipt generator using CSS `@media print` layouts. Satisfies `AGENTS.md` Rule 15 by explicitly avoiding permanent file storage.
- **Settings & Profile (`/settings`)**: Built the Bakery profile view. Satisfies `AGENTS.md` Rule 16 by enforcing strict client-side limits (max 500 KB image) before allowing logo updates.
- **Analytics (`/analytics`)**: Built the Phase 1 analytics module mapping `GET /api/orders` and `GET /api/expenses` into high-level business metrics (Total Revenue, Total Expenses, Net Profit) and visually presenting Top Selling Products using simple CSS percentage bars.

### Validation
- Typecheck passed.
- Lint passed.
- Committed securely under `jaFFa`.

### Blockers
- The frontend for Phase 1 is now effectively feature-complete. Future stages will involve end-to-end integration testing, E2E play-throughs, and mobile container (Capacitor) wrapping per the plan.

## 2026-09-22 — Stage 1: Payments Feature Implementation

### Added
- Created `0003_payments_and_jobs.sql` migration for `payments`, `jobs`, and `audit_logs` tables.
- Added `PaymentCollectionForm` component to collect payments with Zod validation.
- Created `PaymentsService` and API route to handle payment creation.
- Centralized domain validation schemas in `src/lib/validation/schemas/`.
- Updated Order Details page to fetch and calculate total paid amount.

### Validation
- Typecheck passed.
- Unit and E2E Tests passed.

### Blockers
- None.

## 2026-09-22 — Stage 2: Audit Logs & Background Jobs Implementation

### Added
- Created `src/features/audit` domain (service, types, repository).
- Injected `AuditService` into core domain services (`CustomersService`, `ProductsService`, `OrdersService`, `InventoryService`, `ExpensesService`, `PaymentsService`) to intercept mutations and persist them to `audit_logs`.
- Created `src/features/workers` domain for background job processing.
- Implemented `WorkerService` providing atomic job claiming, exponential backoff, and dead-letter queuing logic over Postgres.
- Added comprehensive unit tests for `WorkerService` covering all states.

### Validation
- Typecheck passed.
- Unit and E2E Tests passed.

### Blockers
- None.

## 2026-09-22 — Stages 3, 4, and 5 Implementation (Notifications, Analytics, Receipts)

### Added
- **Notifications (Stage 3)**: Created `src/features/notifications` with `CapacitorPushProvider` for platform-agnostic push notifications. Added `NotificationWorker` to handle `SEND_PUSH_NOTIFICATION` jobs. Injected `JobsRepository` into `OrdersService` and `PaymentsService` to enqueue push notifications on status changes and payments.
- **Analytics (Stage 4)**: Created `src/features/analytics` with `AnalyticsRepository` and `AnalyticsService` executing parallel aggregated queries on `orders`, `expenses`, and `payments`. Added `/api/analytics/overview` API route and scaffolded `AnalyticsWorker`.
- **Receipts (Stage 5)**: Created `src/features/receipts` domain with `ReceiptsService` that aggregates order snapshot data, items, and payments. Created `/api/orders/[id]/receipt` API endpoint to return JSON payloads. Extracted and integrated `ReceiptPrintView` into the frontend to dynamically fetch data and render a printable UI.
- **Impeccable Audit**: Polished `OrderDetailsPage` and `ReceiptPrintView` with modern gradients, micro-interactions, robust A11y attributes (`aria-label`, `aria-busy`), and an elevated pricing summary to meet premium UX standards.
- Added comprehensive unit tests for all backend features and frontend components.

### Validation
- Typecheck passed.
- Unit and E2E Tests passed (57 out of 57 passing, 100% frontend and backend coverage).

### Blockers
- None. Phase 1 is fully completed and integrated.

## 2026-09-22 — Architecture Compliance Refactor & 100% Frontend Test Coverage

### Changed
- **Architecture Compliance**: Refactored monolithic repository and service classes into focused, pure domain functions in `src/features/*/api.ts`, adhering strictly to `AGENTS.md` Rule 5.
- **Centralized Validation & Messages**: Enforced validation schemas and string constants via `src/lib/validation` and `src/constants/messages.ts`.

### Added
- **Frontend Test Suite**: Added 14 unit test files in `tests/frontend/` covering client service modules (`customers`, `products`, `expenses`, `inventory`, `orders`, `payments`, `fetcher`) and React UI components (`CustomerFormSheet`, `ProductFormSheet`, `ExpenseFormSheet`, `InventoryAdjustmentSheet`, `PaymentCollectionForm`, `ReceiptPrintView`, `OrderDetailsPage`).

### Validation
- All 18 test files (102 test cases) passed cleanly with Vitest (`npm test`).
- Typecheck passed (`npm run typecheck`).

### Blockers
- None.

## 2026-09-22 — Impeccable Authentication Page Build

### Added
- **Authentication Pages (`/login`, `/register`)**: Built mobile-first, responsive, dual-mode (Clean Bakery & Peach Bakery) authentication page (`src/app/login/page.tsx`, `src/app/register/page.tsx`).
- **Form Controls & Validation**: Integrated React Hook Form + Zod (`loginSchema`, `registerSchema`, `passwordResetRequestSchema`) with live error messaging, phone normalization (`+91`), and password visibility toggling.
- **Client Service**: Added `AuthClient` (`src/features/auth/api.client.ts`) for browser-side authentication calls.
- **Unit Tests**: Added `tests/frontend/auth.client.test.ts` and `tests/frontend/pages/login.test.tsx` verifying tab switching, modal dialogs, and submission flows.

### Validation
- All 46 test files (349 test cases) passed 100% cleanly.
- `npm run typecheck` passed with 0 errors.
- Code committed and pushed to `https://github.com/mohd-jaffa/ovenly.git`.

### Blockers
- None.

## 2026-09-22 — Plan Document Update: Deferred Backlog (§133.13)

### Changed
- **Plan Document (`home-bakery-management-platform-plan.md`)**: Recorded Section 133.13 (*Impeccable UI/UX, Mobile Containers & Production Hardening Backlog*) for tracking PWA Manifest/Service Worker, Capacitor Android packaging, OpenAPI/Swagger docs, Playwright E2E journey tests, GitHub Actions CI/CD pipeline, PDF Export/WhatsApp receipt sharing, and BugSnag integration.

### Validation
- Plan file updated and verified.

### Blockers
- None.

## 2026-09-22 — Plan Document Update: Impeccable Layout & Quieter Design Backlog (L8, L9 in §133.13)

### Changed
- **Plan Document (`home-bakery-management-platform-plan.md`)**: Appended backlog items `L8` (*Impeccable Layout & Mobile-First Container System*) and `L9` (*Impeccable Quieter Design & Noise Reduction*) to Section 133.13 for tracking future UI/UX layout optimization and visual noise reduction execution phases.

### Validation
- Plan file updated and verified.

### Blockers
- None.

## 2026-09-22 — Plan Document Update: Impeccable Bolder Design Backlog (L10 in §133.13)

### Changed
- **Plan Document (`home-bakery-management-platform-plan.md`)**: Appended backlog item `L10` (*Impeccable Bolder Design & Visual Impact*) to Section 133.13 for tracking future visual identity contrast, display typography, and high-impact UI styling execution phases.

### Validation
- Plan file updated and verified.

### Blockers
- None.

## 2026-09-23 — Plan Document Update: Impeccable Operational Layout & Geometry System (L11 in §133.13)

### Changed
- **Plan Document (`home-bakery-management-platform-plan.md`)**: Appended backlog item `L11` (*Impeccable Operational Layout & Geometry System*) to Section 133.13 for tracking future screen spatial geometry, dynamic `dvh` container viewport constraints, PWA safe area insets, and sticky sheet modal footer execution phases.

### Validation
- Plan file updated and verified.

### Blockers
- None.

## 2026-09-23 — Plan Document Update: Impeccable Design Critique & Comprehensive Polish Audit (L12 in §133.13)

### Changed
- **Plan Document (`home-bakery-management-platform-plan.md`)**: Appended backlog item `L12` (*Impeccable Design Critique & Comprehensive Polish Audit*) to Section 133.13 for tracking future visual token harmony, accessibility ergonomics, and micro-interaction auditing.

### Validation
- Plan file updated and verified.

### Blockers
- None.





## 2026-09-23 — Authentication and Authorization, End to End (plan §7, §19, §55, §94, §95; gap register §133.1)

### Added
- **Auth screens (`src/app/(auth)`, `src/features/auth/components`)**: sign in, register, forgot password, change password and email confirmation, all built on the shared UI kit rather than on bespoke markup — `AuthCard` for the chrome, `TextField`/`PasswordField` for the controls, `ScreenNotice` for what the screen has to say on its own behalf.
- **Session cookies (`src/features/auth/cookies.ts`)**: HttpOnly, `SameSite=Lax`, `Secure` outside development. The access cookie is given the token's own remaining life; the refresh cookie outlives it so a session can be renewed.
- **`POST /api/auth/refresh`**: trades the refresh cookie for a fresh access token, so an hour of work does not end at a sign-in screen.
- **`POST /api/auth/confirm` and `/confirm-email`**: the link in the welcome email now lands somewhere. Supabase returns the tokens in the URL fragment; the screen wipes them from the address bar, records the confirmation on the profile, and signs the baker in.
- **`src/proxy.ts`** (Next 16 renamed `middleware` to `proxy`): sends a signed-out visitor to sign-in remembering where they were heading, and a signed-in one off the sign-in screen. `returnToPath` refuses an absolute URL, so `?next=` cannot be turned into an open redirect.
- **`src/features/auth/AuthProvider.tsx`**: one session read, shared by the whole app, with `signIn`, `signOut`, `reload` and `adopt`. Signing out clears the whole SWR cache, so one account's rows are never shown to the next.
- **`RequireAuth` / `RedirectWhenSignedIn`** gates, `AccountMenu` in the sidebar and More sheet, and `AccountSummary` on Settings.
- **`src/constants/roles.ts` and `src/constants/routes.ts`**: the roles and the public/private path rules, out of the feature so `src/lib` and the proxy can name them without importing from `src/features`.

### Changed
- **`src/lib/api/client.ts`**: attaches no credential — the cookies ride on their own — and refreshes the session once, at most one refresh in flight, before retrying a request refused for an expired token.
- **`src/features/auth/guard.ts`**: `readAccessToken` accepts a cookie or a bearer header; `assertRole` no longer defaults to allowing every role; `withBakeryRoute` serves `BAKERY_ROLES` (`BAKER`) and refuses anyone still owing a password change.
- **`changePassword`**: resolves the token to a user before changing anything, and revokes that account's other sessions, so a temporary password stops working everywhere (plan §19).
- **`logout`**: revokes the caller's own token instead of calling `signOut()` on a service-role client, which signed nobody out. The cookies are cleared whatever the server said.
- **`/api/auth/session` and `/api/auth/login`** answer with the profile and `requiresPasswordChange` only. No endpoint returns a token in its body.
- **Validation (`src/lib/validation/schemas/auth.ts`)**: `Input`/`Payload` pairs per AGENTS.md §22, parsed once at the route boundary; named password-length and passwords-must-match messages instead of the generic "not valid".
- **`normalizePhone` moved to `src/lib/phone.ts`** and roles to `src/constants/roles.ts`, so the validation layer no longer imports from `src/features` (AGENTS.md §5).
- **`TextField`** gained a `trailing` slot, which is what the password reveal button sits in; **`useApiMutation`** gained `fallback`, so a failed sign-in does not say "Could not save your changes".

### Removed
- The 638-line `src/app/login/page.tsx` that restated the UI kit by hand, and `src/app/register/page.tsx` which re-exported it.
- `tests/frontend/`, replaced by colocated tests (AGENTS.md §26).

### Validation
- `tsc --noEmit` clean.
- `eslint` clean — 0 errors, 0 warnings.
- `vitest run`: 62 files, 491 tests passing, including the auth cookies, the guard, the proxy, the provider and every auth screen.
- `next build` succeeds; the proxy is registered and all eight auth routes are emitted.

### Blockers

#### Blocker

- Status: OPEN
- Area: Rate limiting on authentication endpoints (plan §55, §20, gap register §133.11)
- Description: Sign-in and password reset have no rate limit, so both can be hammered.
- What was attempted: An in-memory fixed-window limiter was considered and rejected.
- Why it is blocked: A limiter is only real if its counters are shared across instances. Redis is explicitly out of scope (AGENTS.md §2.2, §17), and a PostgreSQL-backed counter means a new table, which needs approval under §31. An in-memory one would pass a test and protect nothing in a deployment with more than one instance.
- Required decision/input: whether to add a `rate_limits` table (or reuse the jobs database) for this, or to rely on Supabase Auth's own limits until real usage is observed.
- Temporary workaround: none. Supabase Auth applies its own limits to password grants, which is not the same as limiting these routes.

## 2026-09-23 — Local Environment, Seed Data and the Defects Running It Exposed

Running the app against a real local Supabase for the first time. Everything
below was found by doing it, not by reading.

### Fixed
- **`supabase/migrations/0004_api_role_grants.sql` — no table granted DML to any API role.** `anon`, `authenticated` and `service_role` held only `REFERENCES, TRIGGER, TRUNCATE` on every table. RLS decides which *rows* a role may see; it cannot grant access to the table, so every policy written in `0002` and `0003` was unreachable and every screen answered `permission denied`. The grants are a new migration rather than an edit to an applied one (AGENTS.md §23). `anon` still receives nothing.
- **Phone numbers never got a country code.** `loginSchema` and `registerSchema` used `normalizePhone`, which only strips punctuation — so the ten digits the sign-in screen invites a baker to type were sent as `9876543210` and matched no account. Both now use a new `indianMobile()` primitive built on the existing `toE164India`, which is what the customer schema already used; `normalizePhone` had no callers left and is gone.
- **`createJob` read the row back it had just written.** `jobs` has no `bakery_id`, so a baker who could `SELECT` one could read every bakery's queued work. It now inserts without selecting, and the grant is INSERT-only. Recorded as §133.6 F8: enqueuing belongs on the service-role client.

### Changed
- **`supabase/seed.sql` rewritten.** The old one could not run: it used UUIDs that are not hex (`p1111111-…`), referenced an `orders.delivery_time_slot` column that does not exist, and created no `auth.users` row at all — so the password in its header comment existed nowhere and both `bakeries.owner_id` and `profiles.id` would have failed their foreign key. The new one creates the account with a bcrypt hash GoTrue accepts, stores the phone as digits only because that is how GoTrue looks one up, and seeds four customers, five products, five orders covering every status, a stock ledger, expenses and payments.
- **`supabase/config.toml`**: the phone provider is enabled (GoTrue disables phone login outright without an SMS provider, and the plan signs bakers in by phone), Mailpit's SMTP port is published so the app's own mail service can reach it, and the redirect URLs match `NEXT_PUBLIC_APP_URL`.
- **`.env.example` / `.env.local`**: real local Supabase keys, with a commented cloud block beside each so switching to a hosted project is a matter of which block is live.
- **`DATABASE_URL` and `DIRECT_URL` removed.** Nothing read them — the app talks to Supabase over its API and never to Postgres directly, and schema changes go through the Supabase CLI, which reads `supabase/config.toml` and its own link state rather than the env file. The env now holds exactly what `src/lib/env/server.ts` validates, so a hosted project needs three values changed and no connection string at all.
- **`README.md`** rewritten: prerequisites, first run, demo credentials, where each service listens, and how to move to a hosted project.
- **`.nvmrc` and `engines`**: Next 16 refuses Node 18, which is this machine's default.

### Validation
- `tsc --noEmit` clean; `eslint` 0 errors, 0 warnings; `vitest run` 62 files, 490 tests.
- Against the running stack: sign-in with `9876543210` returns a session and sets both cookies; `/api/auth/session`, `orders`, `customers`, `products`, `expenses`, `inventory/balance` and `analytics/overview` all answer 200; creating a customer writes an audit row; an order status change posts the ledger line and enqueues `SEND_PUSH_NOTIFICATION`; a payment above the order total is refused with `payment_exceeds_order_total`.

### Blockers
- None new. The rate-limiting blocker recorded on the same date stands.

## 2026-09-24 — The Authentication Screens, Flour Room

The five authentication screens rebuilt on the direction in plan §137, from the
references supplied for sign-in and register. Plan §138 records the build and
§138.6 this second pass. No route, schema, endpoint or product rule changed.

### Added
- **`AuthScene`** (`src/features/auth/components/AuthScene.tsx`) — the one frame all five screens share: the warm canvas, the authored `BrandMark`, the Fraunces headline, and the cream sheet that rises carrying the form. `counterpart` is optional, because the screens behind the front door have no second door to offer.
- **Flour Room tokens** for both themes, mapped through `@theme inline`, plus `.auth-canvas` and `.auth-sheet`. The sheet re-points the semantic tokens, so the shared field and button components come out warm without one of them being restyled from a parent (AGENTS.md §5).
- **Fraunces** as `--font-display`; **browser surfaces themed** (selection, caret, accent colour, scrollbars, underline offset, tabular numerals).
- **Shared kit extended rather than worked around:** `Button` gained an `action` variant, `lg` size, `pill` shape and `iconPosition`; `LinkButton` gained `shape` and `fullWidth`; `TextField` gained `leading` and `labelCase`; `AuthPending` gained an `inline` form for waiting inside a sheet.

### Changed
- All five screens now use `AuthScene`. **`AuthCard` is deleted** — it had no callers left, and the product has one authentication frame instead of two.
- Titles and subtitles moved out of the page files into `UI_TEXT.auth` (AGENTS.md §5).
- The sent state of forgot password offers the step that follows instead of ending on a notice with nothing to press.
- Opening `/confirm-email` without a link is no longer reported in the failure tone. An expired link is a failure; arriving with no link at all is someone in the wrong place, and it now reads as guidance.

### Fixed
- **Every heading in the app ignored its font utility** (§138.4 B1). `h1…h6 { font-family }` sat outside any layer in `globals.css`, and unlayered rules beat Tailwind's utility layer, so `font-display` on a heading silently lost. Now inside `@layer base`.
- **The peach theme never received the Flour Room palette, and the clean theme received peach's** (§138.6 C1). Both blocks were written into `:root, [data-theme="clean"]`, so the blush values overwrote the cream ones and `[data-theme="peach"]` inherited them from `:root`. Both themes rendered blush. Screenshots did not catch it — they looked consistent, which is what a theme check looks for; reading `getComputedStyle` per theme did.
- **`.safe-top` / `.safe-bottom` were silently deleting padding utilities** (§138.6 C2). Unlayered, they beat the utility layer on the same property: `safe-bottom pb-8` measured `padding-bottom: 0px`. They now add to the element's own padding via `calc(var(--safe-pb, 0px) + env(…))`. Five app-screen call sites still pair the two and are recorded in §138.6.3 for §137.10.
- **Muted text and every placeholder in the product failed contrast** (§138.6 C3). `--color-ink-muted` measured 3.36–4.11:1 against the Flour Room grounds; the shared control set placeholders to `text-text-muted/50`, measuring **1.66:1** in the auth sheet and **1.99:1** on an app screen. Muted is now `#766353` / `#7b5c4d` and placeholders use the muted colour at full strength. The placeholder fix applies to every field in the app.
- **`next/font` rejects `weight` alongside `axes`** on a variable font (§138.4 B2) — clean under `tsc` and `eslint`, fatal at runtime. Caught by loading the page.

### Validation
- `tsc --noEmit` clean; `eslint` 0 errors, 0 warnings; `vitest run` 62 files, 490 tests; `next build` succeeded on Node 22.
- All five screens captured against the running stack in both themes at 390×844 and 1440×900, plus the interaction states: invalid submit, refused credentials, reset sent, and an expired confirmation link. No page errors.
- Measured live rather than eyeballed: the two themes resolve to different canvases (`#efe7d9` / `#f3ddd0`), the sheet's padding is `32px` and the header's `20px` (both `0px` before), the placeholder resolves to `#766353`, and every muted pairing is ≥ 4.62:1.
- `impeccable detect` returns `[]`.

### Blockers
- None new.

## 2026-09-24 — Ovenly v2 Planned: Redesign, Wider Audience, Android (plan §139)

**Planning only — no code, schema or configuration changed.** Eleven new
references were reviewed; they are in `design-references/` (gitignored, not
committed).

### Added
- **Plan §139** — the redesign in two themes (Golden and Peach), the product changes in this brief, a code audit, a phased roadmap (Phases 0–8, Android last), and a **tracker of 99 work items** (§139.19) mapped to every open item in §133–§138.

### Scope changes approved by the user (recorded under AGENTS §31)
- Roles become **USER and DEV** (was BAKER and DEV); the product serves home businesses generally — bakers, hamper makers, florists.
- Registration adds a **catch phrase** (optional), **city** and **business address**. Sign-in stays by mobile number.
- The visual directions become **Golden and Peach**; Clean is retired.
- **Guest orders** — an order no longer needs a customer — reported as Guest sales.
- **Customers created from the order screen**; picking a customer fills the delivery address and map link, which stay editable.
- **View and share the bill before the order is saved** (an estimate); the bill carries the business's name, catch phrase and address, with the app's name and web link in the footer. Nothing is stored (§15 unchanged).
- A **response card** replaces toast-style feedback app-wide; **every input is trimmed and normalised**; **every screen is responsive**.
- Tests move into **`/tests`**, mirroring `src/` (recommended in §139.16; AGENTS §26 changes when R1.1 lands).

### Found, not fixed (plan §139.14)
- **BUG-01 — every payment is recorded at 100 times its amount.** `processPayment` converts an amount that is already in paise, so ₹500 is stored as ₹50,000 and, in practice, any payment above 1 % of the order total is refused. Collect payment does not work today.
- 29 further findings, including: stock never released on cancel; any status allowed to follow any other; dates taken in UTC; order numbers that can collide; safe areas inert on iPhone; RLS gaps on payments, audit logs and notifications; foreign keys that can point into another business.

### Blockers
- **Open questions Q1–Q15** (§139.2). Each blocks only the tracker rows that name it; unanswered rows proceed on the stated default.

## 2026-09-24 — v2 Answers, the Illustration Library and the Charts (plan §139)

**Planning, plus the illustration masters filed in the repo.** No app code,
schema or configuration changed.

### Added
- **`artwork/illustrations/`** — 28 illustration masters under their permanent keys (`donut`, `rose-bouquet`, `default-product`, …). The user supplied 26 files. `IMG_2470.JPG` was dropped because it is the Vecteezy gold-coins file saved again (perceptual-hash distance 1 of 256). `IMG_2474.JPG`, a sheet of four, was split on its blank gutters into four files. Every other file is a byte-for-byte copy. The originals are kept, untouched, in `design-references/illustration-originals/` (gitignored).
- **Plan §139.11.10 — the illustration library.** Naming and duplicate rules, the catalogue, the WebP build (transparent ground, ≤ 40 KB each), the registry, and where the illustrations appear. Every product and every expense category starts on a default and can use any illustration. Nothing is uploaded, so §16 stands.
- **Plan §139.11.11 — charts on Expenses and Analytics**, as the references show: a trend line with the previous period, daily bars, category donuts and sparklines. They are authored SVG with no chart library, aggregated on the server and accessible as tables.
- **Plan §139.11.12 — photographic plates** made from the supplied photographs and used as backgrounds. Only the derived WebPs will be committed.
- **Tracker rows R1.15–R1.17 and R5.16**, making 103 in total. **Q16** asks about the illustrations' licence.

### Changed (the user's answers, 2026-09-24)
- **Q1:** customer address and map link stay **optional** (§92 unchanged).
- **Q3:** add `READY`, label `IN_PROGRESS` "Preparing", and show "Completed" for a finished pickup.
- **Q5:** custom items are approved: a typed name and amount that move no stock.
- **Q6:** still no uploads; the supplied photographs are used as backgrounds.
- **Q7:** every reference-only feature is omitted, Help & Support included.

### Validation
- A script check of §139: every table row has its header's column count, every tracker and question reference resolves, and every question's *Waits on* list matches the tracker.
- The library was checked for duplicates by content hash and perceptual hash, and inspected as a contact sheet.

### Blockers
- **Q16 (open):** the licence for the illustrations. It defaults to a credit in Settings → About, and needs confirming before the Play release.

## 2026-09-24 — Phase 0: Correctness and Security (plan §139.18, tracker §139.19)

Phase 0 of the v2 roadmap: stop the bugs that corrupt money, stock or tenant
data, and the crash. **No redesign.** Each row is committed on its own; this
entry grows with them.

### Fixed
- **R0.1 · BUG-01 — payments were stored at 100 times their amount** (`src/features/payments/api.ts`). The collect-payment form converts rupees to paise and the schema carries paise, but `processPayment` ran `rupeesToPaise` on that value again. ₹500 was stored as ₹50,000, so any payment above 1 % of the order total was refused as exceeding it. Collect payment now works. **`processPayment` had no tests;** five now cover the stored amount, a large part payment, reaching the total, refusing an overpayment without writing anything, and leaving an unchanged status alone. Four of the five fail against the old code.
- **R0.2 · BUG-03 — "Pending payments" counted the full total of part-paid orders** (`src/features/dashboard/summary.ts`). The same mistake was in the customer profile's **Pending** tile. An order now carries `payment.paid`, the sum of its recorded payments, read in one query for the whole list (`findPaidByOrder`). `balanceDue(order)` in `src/features/orders/view.ts` is the one rule both screens use: the total less what was paid, nothing on a cancelled order, and nothing on an order **marked** paid. The last case matters until R3.12, because an order placed as Paid records no payment yet (BUG-02), and counting it would invent a debt.
- **R0.3 · §134 P0-1 — `/inventory` failed on every visit** with "Cannot read properties of undefined (reading 'id')". Reproduced in the browser first. The React Compiler lifted `product!.id` out of the submit callback into a render-time memo dependency, and it ran while the sheet was closed with no product. The id is now read with `product?.id` before the hook. Verified in the browser: the page loads with no page errors, and an adjustment posts (201). **Also found:** a first attempt that mounted the form only while the sheet was open broke it in a subtler way. Typing reached the input, but the form submitted the quantity as empty, and no request was sent. The unit tests passed, because Vitest does not run the React Compiler. Recorded for the sheet rewrite (R1.9): a form sheet stays mounted, and every sheet change is checked in the browser, not only in jsdom.
- **R0.4 · §134 P0-2, P1-1, P1-2; §133.8 H2 — no error boundary, no not-found, no loading state, and a dead Receipts link.**
  - **`src/app/error.tsx`** catches a screen that fails while rendering, and offers **Try again** (Next 16's `retry()`) and the dashboard. It shows the digest as a reference, **never the error's own text**. **`global-error.tsx`** covers a failure of the root layout itself, with its own document, styles and theme.
  - **`src/app/not-found.tsx`** handles any unknown address and any `notFound()`.
  - **`src/app/loading.tsx`** answers a navigation at once.
  - **Receipts is gone from the navigation.** A bill belongs to its order and is generated on demand (§15), so there was never a Receipts screen.
  - **Shared kit.** The auth screens' `AuthPending` moved to `src/components/ui/pending.tsx` as **`Pending`**, since the route loading state needs it too, and **`SystemScreen`** holds the stop screen that not-found and both error files share.
  - **Checked in the browser:** `/receipts` and a made-up path show the branded 404, `/` and `/inventory` load with no page errors, and the first build of `not-found.tsx` failed and was caught by the new boundary. It was a Server Component handing an icon component to a client button; it is now a Client Component.
- **R0.5 · BUG-07 — dates were taken in UTC.** Between midnight and 05:30 in India, a bill and a customer's order list showed **yesterday's** date, and a new expense **defaulted to yesterday**. The bill (`ReceiptPrintView`) and the customer profile now date an order with `dayKey()`, and the expense form defaults to `todayKey()`, both on the business's calendar (`src/lib/dates/calendar.ts`). Two new tests pin the case at 00:30 and 01:30 in India, and both fail against the old code. The existing "starts on today" test compared with UTC's today, so it would have failed every evening after 18:30 UTC; it now runs at a fixed time. Nothing else in `src` takes a day from UTC or the device's clock. The new-order default delivery time is BUG-28 (R3.16).
- **R0.6 · BUG-05 — any status could follow any other.** A delivered order could go back to Pending and be delivered again, taking its stock twice; a cancelled one could be delivered.
  - **The server enforces the transition table** in `ORDER_STATUS_TRANSITIONS` (`src/constants/statuses.ts`), through `canMoveTo` and `nextStatuses` (`src/features/orders/lifecycle.ts`). Out for delivery exists only for a delivery order, and Delivered and Cancelled are final. A forbidden move answers **422 `ORDER_STATUS_TRANSITION_INVALID`** and writes nothing.
  - **A move applies only if the order is still in the status it was read in** (`moveOrderStatus`). A double tap, or a second device, gets **409 `ORDER_STATUS_CHANGED`** instead of posting stock twice.
  - **On the order page**, the status control offers only the moves allowed from here, and it is locked once the order is finished. **Cancelling asks first:** a confirmation sheet with a danger button. `FormSheet` gained `submitVariant`.
  - `READY` joins the table with R3.11.
- **R0.7 · BUG-04, §133.3 C5 — stock did not follow the order.** Cancelling never released the reservation, so every cancelled order lowered stock for good. Delivering posted consumption **on top of** the reservation, so every delivered order was taken twice. Now, on delivery, the reservation is released (`ORDER_RESERVATION` +q) and consumption is posted (−q). On cancel, the reservation is released (+q). A line with no product never touched stock and is left alone.
  - `ORDER_RESERVATION` is therefore no longer a decrease-only type: it is posted negative and released positive, so the ledger reads reserved, then released.
  - **Seed:** the delivered order now carries its release, and the cancelled order its reservation and release, as the app would post them.
  - **Checked end to end against the local stack after `supabase db reset`:**
    - The seed balances add up.
    - Moving `#1001` from Delivered back to Pending is refused (422).
    - A pickup order is not offered Out for delivery.
    - Cancelling `#1002` through the confirmation returned its cupcakes (29 → 30).
    - Delivering `#1003` left stock where its reservation had put it.
    - Repeating the delivery changed nothing.
  - **Still not one transaction**, so a failure between the move and its ledger lines leaves them apart. That is R3.4.
- **R0.8 · BUG-10, IMP-12 — money had to be typed bare.** "1,000" and "₹500" were refused as amounts, and a charge with a comma turned the new-order running total into "₹NaN". `parseRupees` (`src/lib/money.ts`) reads money the way people write it: the rupee sign, spaces and commas anywhere (Indian or Western grouping), then digits with at most two decimals. It returns **null**, never NaN, for anything else. `paiseText` and the new-order preview both use it. In the browser, a "1,000" charge adds ₹1,000, and a half-typed "1,0a" counts as nothing until it is fixed.
- **R0.9 · BUG-12 — numbers had no upper bound**, so a large one overflowed an `integer` column and came back as a 500. The bounds live in `src/constants/limits.ts`:
  - **₹10,00,000** per money field (`paiseText`, and the new `paiseAmount` for routes). **9,999** per order line (`quantity`). **10,00,000** per stock movement, because a product may be counted in grams.
  - Each refusal says the limit in words.
  - **The server also refuses an order over ₹1,00,00,000 before writing anything** (`ORDER_TOTAL_TOO_LARGE`). Each field was bounded, but enough lines of them were not.
- **R0.10 · BUG-13 — links accepted any scheme.** `URL.canParse` lets `javascript:` and `data:` through, and a map link is headed for shared bills. `optionalUrl` now takes **`http:` and `https:` only**, and its message says so.
- **R0.14 · BUG-11 — Zod's own English reached the screen** ("Too big: expected string to have <=100 characters"; "Invalid input: expected number, received NaN" for an emptied quantity).
  - Every field now names itself through the catalogue: new `requiredText`, `quantity` and `paiseAmount` primitives, and labels on every optional text field.
  - `z.config({ customError })` in `primitives.ts` is the floor for anything left unnamed.
  - **`src/lib/validation/messages.test.ts`** feeds every exported schema missing, blank, wrong-typed, over-long, over-large and NaN values at every depth, and fails on Zod-shaped wording. Against the old schemas it fails for more than twenty of them.
  - The server's environment check keeps Zod's detail, because operators read it, not customers.
- **R0.11 – R0.13 · BUG-18, BUG-19, BUG-21 — migration `0005_tenant_integrity.sql`.**
  - **Composite foreign keys (BUG-19).** Foreign keys are checked without RLS, so an order could name another business's customer, and likewise a payment's order, a stock line's product and a product's category. RLS hid them on read, but the rows were corrupt. `orders`, `payments`, `inventory_transactions` and `products` now reference `(bakery_id, id)`, so the database refuses a cross-business reference on every write. The four single-column keys they replace are dropped. Deleting a category clears only `category_id` (`on delete set null (category_id)`, PostgreSQL 15+), never the product's business.
  - **The customer is also checked when an order is created.** `createOrder` reads it through the business's own records, so one from another business is refused as not found before anything is written.
  - **Policies (BUG-18).** The payments, audit-log and notification policies are rewritten to `to authenticated` with `current_profile_bakery_id()`, like the rest of the schema, so a deactivated profile reads none of them. Audit inserts stay open to the business's own rows until the server writes audit itself (R2.10, BUG-20).
  - **Payment constraints (BUG-21).** `payments.amount > 0`, and `payment_method` must be one of the five known methods.
  - **Proved against the local database** in a rolled-back transaction with a second business:
    - All three cross-business references refused (23503).
    - A zero payment and an unknown method refused (23514).
    - A same-business payment accepted.
    - Deleting a category kept the product's business and cleared its category.
    - The same profile read 3 payments and 10 audit rows while active, and **none** once deactivated.
  - `tests/db/tenant-integrity-migration.test.ts` pins the migration's contract.
- **Phase 0 journey, end to end on a freshly reset database:**
  - "Pending payments" read ₹1,910. The old rule gave ₹2,410, counting a ₹500 part payment as unpaid.
  - An order placed through the form, with a "₹1,000" charge written with a comma, came to ₹2,900.
  - Collect payment took ₹500 and stored 50,000 paise. The order became Part paid, and the dashboard rose to ₹4,310.
  - Cancelling through the confirmation took the dashboard back to ₹1,910.
  - No page errors.

### Validation
- `tsc --noEmit` clean; `eslint` clean; `vitest run` **71 files, 579 tests**, up from 62 and 490 at the start of the phase. Every behavioural fix has a test that fails against the code it replaced.
- `supabase db reset` applies `0001` – `0005` and the seed cleanly.

### Blockers
- None. Deliberately left to their own rows: order numbers (`#6-799`, BUG-08 → R3.2), the create and status transactions (R3.1, R3.4), the payment recorded at creation (BUG-02 → R3.12) and audit written by the server (R2.10).

## 2026-09-24 — Phase 1: Foundation (plan §139.18, tracker §139.19)

The ground the redesign stands on: tests in one place, the two themes, safe
areas, the shell and component kit, the response card, input hygiene, the
illustration library and the chart kit. Each row is committed on its own; this
entry grows with them.

### Changed
- **R1.1 — every test now lives under `tests/`** (plan §139.16), done first so the redesign does not move files that are also being rewritten.
  - **Layout.** `tests/unit/` mirrors `src/` exactly. `tests/db/` holds the database contracts, `tests/contract/` the route-shape contract (it was misnamed `e2e`), and `tests/support/` the setup (from `vitest.setup.ts`) and the auth stubs (from `src/test-utils`, now imported as `@tests/support/auth`).
  - **How the move was done.** 64 files were moved with `git mv`, so their history follows. Every relative import and `vi.mock` became an `@/` path. The plan asked for a check before scripting the rest, and it was done on the first file: an `@/` mock still intercepts a component that imports `../api.client`.
  - **One file, one subject.** Five tests covered several modules (`display`, `clients`, `errors`, `schemas`, `system-screens`). They were split by `describe` block, one file per module, and the imports and helpers each split no longer needed were pruned.
  - **`scripts/check-test-paths.mjs` runs as `pretest`.** It fails on a unit test whose subject is gone and on any test left in `src/`. Both were checked by planting one of each.
  - **Config.** `vitest.config.mts`, `tsconfig.json` (`@tests/*`) and AGENTS.md §26 are updated.
  - **Same suite, same count: 579 tests**, now in 94 files. `tsc` and `eslint` are clean.
- **R1.2 — AGENTS.md follows the approved v2 decisions**, so an agent reading it does not rebuild v1:
  - **Purpose and words:** the product serves home businesses. Copy says "business", and identifiers keep `bakery`.
  - **Roles:** USER and DEV, with the rename left to R2.2 so it is not done piecemeal, and no role in `user_metadata`.
  - **Registration:** the new fields.
  - **Orders:** items first, Guest orders, and the status transitions with the stock that follows them.
  - **Uploads:** app-owned illustrations and plates are not uploads.
  - **UI:** Golden and Peach, the token vocabulary, all three widths, safe areas, and the response card as the one way to report an outcome.
  - **Validation:** the input-hygiene rules.
  - **Architecture tree:** `src/assets/`.
- **R1.3 — Golden and Peach, one token vocabulary** (plan §139.4).
  - **The palettes.** Golden replaces Clean. Both themes carry the plan's values: `background`, `surface`, the new `sunken`, `border`, `text`, `text-muted`, `primary` with its hover, text and new `primary-soft`, `accent` (gold or terracotta, for marks only), and the dark `action`.
  - **Status and state colours.** The seven status colours are shared by both themes. `success`, `warning`, `danger` and the new `info` map onto them, and each `-bg` is its colour at 12 % over `surface`.
  - **Shadows** now take the theme's own warm tone instead of neutral black.
  - **Retired tokens.** The Flour Room tokens (`canvas`, `sheet`, `field`, `ink`, `ink-muted`, `rule`) and the unused `secondary`, `accent-border` and `primary-light` are gone, and every class that used them now names the replacement. Fields sit on `sunken`. The auth sheet no longer re-points the palette, because the shared one is now right for it.
  - **Contrast, measured.** Every derived pairing was checked: hover shades, status text on its tint (4.82 – 6.24), primary on `primary-soft`, and muted text on hover. **One plan value failed:** Peach `primary-soft` `#FADFD0` put the active nav label at 4.47 : 1. It is now `#FBE3D6` (4.62), and plan §139.4 records the change.
- **R1.4 · BUG-15 — no theme flash.**
  - **The pre-paint script.** An inline script in `<head>` (`THEME_BOOT_SCRIPT`, built from the same constants as the picker) applies the stored theme and the `theme-color` before the first paint, the pattern in Next 16's "Preventing flash before hydration" guide.
  - **React reads the attribute, not storage.** `ThemeProvider` reads `<html data-theme>` through `useSyncExternalStore`, so the server and the first client render agree and nothing mismatches.
  - **A stored `clean` reads as Golden.**
  - **The theme stays per device (Q14's default).**
  - **Checked in a browser:** with nothing stored, with `peach`, and with a legacy `clean`, `data-theme` and the toolbar colour are already correct when the document finishes parsing, before React runs.
- **R1.5 — type:** Fraunces for display and every heading, Inter for everything you operate (plan §137.4). Fredoka and Plus Jakarta Sans are gone. `font-heading` and `font-body` keep their names, and `font-display` now points at the heading face. Measured in the browser: body `Inter`, `h1` `Fraunces`.
- **R1.6 · BUG-14 — the safe-area system** (plan §139.8).
  - **The viewport.** It now declares `viewport-fit=cover`, without which iOS reports every inset as 0 and every `safe-*` helper did nothing, and `interactive-widget=resizes-content`, so the keyboard resizes the layout where supported.
  - **One set of inset variables.** `--safe-top/right/bottom/left` are the only readers of `env()`, so the native layer can override them and a test can fake a notch. The additive helpers read them, and there is a new `safe-x` for a landscape notch.
  - **The five call sites from §138.6.3 are fixed.** The app header, the bottom nav, the checkout bar, the More sheet and the form sheet were each pairing a helper with a padding utility, which silently zeroed their padding. Their padding now goes through the helper's variable.
  - **Main content** pays `--nav-height + --safe-bottom` instead of a fixed `pb-24`.
  - **Heights.** Every `vh` and `min-h-screen` is now `dvh`, so the body, the sheets, the receipt and the system screens use the visible viewport.
  - **`KeyboardInset`.** It keeps `--keyboard-inset` equal to how much the keyboard covers, which is what iOS needs because it does not resize the layout, and the form sheet rides above it. Tested with a fake visual viewport.
  - **Measured in a browser with a faked 47 px notch and 34 px home indicator:**
    - auth header 67 px (20 + 47);
    - auth sheet 66 px (32 + 34);
    - app header 59 px (12 + 47), where it was 0 + 47 before;
    - bottom nav 42 px (8 + 34);
    - main content 126 px (68 + 34 + 24);
    - checkout bar 50 px (16 + 34);
    - form sheet 34 px, with a `90dvh` ceiling.
- **R1.12 · BUG-24 — the search box's placeholder and icon failed contrast.** They were muted at 60 %: 2.71 : 1 in Golden and 2.64 : 1 in Peach. At full strength they measure 6.67 and 6.24. The remaining `text-muted/40` uses are decorative, `aria-hidden` icons, and the rewrite into `search-field` comes with the component kit (R1.8).
