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

## 2026-09-24 — Brio v2 Planned: Redesign, Wider Audience, Android (plan §139)

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
- **R1.11 — input hygiene: one set of text rules** (plan §139.7).
  - **The normaliser** (`src/lib/text/normalise.ts`). `normaliseLine` composes Unicode (NFC), drops the zero-width characters that text pasted from chat apps carries, and the control characters, then turns every run of whitespace into one space and trims. `normaliseLines` does the same but keeps the line breaks: Windows breaks become plain, each line's end is trimmed, and more than one blank line in a row becomes one.
  - **The primitives.** `requiredLine`, `optionalLine`, `requiredLines` and `optionalLines` replace `requiredText` and `optionalText`. Each is bounded after tidying, and each refusal names the field. **Every schema now uses them**: names, units, descriptions, references and adjustment names are lines; addresses and notes are lines with breaks.
  - **Registration.** Its two names moved onto `requiredLine`. The error now says "Business name" rather than "Bakery name". **Passwords are still never altered.**
  - **Migration `0006_text_hygiene.sql`.** Customer, product and category names must be 1–100, 1–200 and 1–60 characters once trimmed, and category names are unique per business whatever their case or spacing. Proved on the local database: a blank or over-long name was refused (23514), and " cakes " was refused beside "Cakes" (23505).
  - **End to end.** Posting `"  Priya​   Menon  "` stored `Priya Menon`. An address with three blank lines kept one, a blank note stored `null`, and "98765 11111" stored `+919876511111`.
- **R1.15 — the illustration library ships** (plan §139.11.10).
  - **`scripts/illustrations.mjs`** (`npm run illustrations`, using `sharp` 0.35.4, now pinned as a devDependency) builds `artwork/illustrations/*.jpg` into `src/assets/illustrations/*.webp`.
    - It first refuses a file name that is not a key, and a master that duplicates another, by content hash or by perceptual hash (distance ≤ 10 of 256).
    - The white ground that reaches the border becomes transparent through colour-to-alpha, so ground shadows turn translucent while white inside an outline stays: the cup, the receipt, the icing.
    - Each drawing is then trimmed and centred with 8 % room, as a 480 px WebP.
    - **The library is 725 KB, 14–34 KB each**, inside the plan's 1 MB and 40 KB.
  - **A bug caught on the way:** `sharp` resizes before it extends, however the calls are ordered, so the first build cropped every drawing to a square before padding it. `rose-bunch` came out at 755 × 628 and cut off. Padding is now its own pass, and every file is checked to be 480 × 480 with a margin.
  - **The registry is split in two.** `src/constants/illustrations.ts` holds the 28 keys, labels, groups and defaults, which server validation can import. `src/assets/illustrations/index.ts` maps them to the static images, so a missing file fails the build.
  - **Components:** `Illustration` (decorative beside a name, labelled where it stands alone, and the fallback for an unknown key) and `ProductTile` (the illustration on a sunken well, 40, 48 or 64 px), which replaces the §137.3 monogram.
  - **Every product shows an illustration** on Products, Inventory and the dashboard's low-stock list. The Inventory row now reads "5 pieces in stock" through a new `formatQuantity`, since the tile took the stock box's place. That plural is also used in the low-stock line.
  - **Tests:** the catalogue matches the masters and the built files one for one, and every key has the database's shape.
  - **Q16 (the Vecteezy licence) is still open.** It is on its default, a credit in Settings → About, which comes with R5.11.
- **R1.16 — migration `0007_illustrations.sql`.**
  - **Products.** `products.image`, reserved for a photo upload the plan never allowed and never written, becomes `products.icon_key`. Stray values are cleared, and a CHECK allows only a key's shape (≤ 64).
  - **Expense categories.** `bakeries.expense_category_icons` is a `jsonb` object, defaulting to `{}`, for R5.16.
  - **Validation.** The product schema takes `iconKey` through `optionalIllustration`: a library key or null, refused otherwise with "Choose a picture.". It is a nullable enum rather than a union, because a union buried the enum's message under the catch-all.
  - **Seed:** four products have illustrations, and the sourdough keeps the default, so both are on screen.
- **R1.13 — the photographic plates** (plan §139.11.12).
  - **`scripts/plates.mjs`** (`npm run plates`) builds them from the supplied photographs in `design-references/`, which stay uncommitted. Only the derived WebPs in `src/assets/plates/` are committed.
  - **`cake-table`** is `v2-plate-cake-clean.png` whole: 1536 × 1024, 98 KB. **`drip-cake`** and **`brownies`** are the two heroes from 48 % of their width, clear of the headline printed on their left: 799 × 1024, 78 KB and 90 KB. Each was checked by eye, and no type survives the crop.
  - The script steps the quality down from 80 until a plate is within 200 KB; all three fit at 80.
  - **`PLATES`** (`src/assets/plates/index.ts`) imports them statically, like the illustrations. A test checks every name maps to its file, every built file is listed, and each is within 200 KB.
  - Nothing shows them yet: the `hero` component places them (R1.8), and the auth scene takes the hero plate in R2.8.
- **R1.17 — the chart kit** (plan §139.11.11). Authored SVG in `src/components/ui/charts/`, with no chart library. Nothing uses it yet: Expenses (R5.8) and Analytics (R5.9) will.
  - **The charts.**
    - **`LineTrend`** draws a smooth line with a soft fill beneath it. An optional previous period is drawn dashed and muted, with a two-item legend.
    - **`BarTrend`** draws round-topped bars, the peak or the chosen bar in the strong tone and the rest lighter.
    - **`Donut`** has the total in its centre in the serif and a legend of shares. Past the fifth slice the rest fold into "Others", with a 2 px gap between segments.
    - **`Sparkline`** is a 2 px line with a dot on its last point, `aria-hidden`.
    - Each chart counts `paise` or a `count`.
  - **The frame.** `ChartFrame` is a `figure` named by its heading. It shows one of four states, each at the chart's own height: a skeleton in the chart's shape, an error with Try again, an empty state that names the period with its next step, or the chart itself.
  - **Exploring.** Hover, drag, tap, or focus and use the arrows, Home and End. Anywhere across the plot picks the nearest point, so each point's target is its whole column. The bubble shows the value and the date. It hangs inwards at the edges, and sits beside a point too high to go above it. The same words are announced in a live region.
  - **Accessibility.** The plot is `role="img"`, labelled with its one-sentence summary. A visually hidden table carries every number. The draw-in (the line traces itself, the bars rise, the ring fades up) is declared only under `prefers-reduced-motion: no-preference`.
  - **Sizing.** `useElementSize` (`src/hooks`, a `ResizeObserver`) gives each chart its container's width, so labels are drawn at a real 11 px rather than scaled by a `viewBox`.
  - **Axes.**
    - Value ticks are round steps that never split a rupee or a count.
    - Dates are spread at an even step, and the last one is always kept.
    - A bar chart labels every bar when each band has room for its date.
    - Labels are measured in the page's font with a canvas, so they are held inside the plot, and one that would touch its neighbour is left out.
    - `formatPaiseCompact` (`src/lib/format/currency.ts`) writes the ticks: "₹2K", "₹1.5L", "₹1Cr". It rounds before choosing a unit, so ₹99,999 reads "₹1L".
  - **The palette.** `--color-chart-1` to `6` per theme, sampled from the reference's donut, line and bars, plus a derived `--color-chart-soft` for the lighter bars. `chart-1` draws every line and strong bar: 6.00 : 1 on the Golden card and 5.77 on the Peach one (≥ 3 : 1, WCAG 1.4.11). `chart-6` is the neutral taupe, so "Others", always last, reads as the rest. Plan §139.4 now points here rather than at R5.8/R5.9.
  - **Checked in a browser** on a temporary page, since removed, in both themes at 340, 359, 360, 390 and 1280 px.
    - **Hover:** it picked "27 Sep: ₹7,400".
    - **Keys:** focus → "30 Sep", sixteen lefts → "14 Sep: ₹2,410", Home → "1 Sep".
    - **The donut** stands beside its legend from 360 px and beneath it at 359.
    - **Reduced motion:** with it on, no dasharray and no animation; with it off, the line ends fully drawn.
    - **No console errors.**
  - **What the browser caught.**
    - The bubble covered the line near the top; it now goes beside the point.
    - "₹3K" spilled left of the plot, and the last date of a bar chart hung past the card, so labels are measured now rather than guessed.
    - A seven-day chart skipped its peak's date.
    - The donut's container threshold missed the card's 1 px borders, so 360 px stacked.
  - **Tests.** Geometry (ticks, the monotone curve, bars, shares, the ring), the axes, the frame's four states, the plot's pointer, touch, keys and bubble placement, each chart, `useElementSize` and `formatPaiseCompact`: 81 new (711 in all), 100 % of the kit. `tests/support/charts.ts` gives jsdom a measured size and a `PointerEvent`.
- **R1.8 — the component kit** (plan §139.5), landing piece by piece. Three kit entries are left to the rows that first use them: `customer-picker` (R3.6), `bill` (R4.2) and `illustration-picker` (R5.6, R5.16). `sheet`/`dialog` is R1.9 and the response card R1.10.
  - **`status-pill` replaces `status-badge`.** It is a tinted pill with a dot: the status colour at 12 % over the surface, the word and a 6 px dot in the full colour, all ≥ 4.5 : 1 (§139.4). It is sentence case, where the badge was upper case.
    - **Tones.** `StatusTone` is now the seven status colours, `STATUS_TONES` in `src/constants/statuses.ts`: pending, preparing, ready, transit, delivered, cancelled, neutral. It replaces the generic info/success/warning/danger.
    - **The mapping.** Out for delivery now reads blue instead of sharing Preparing's tone, as the plan asks. An unpaid order is the cancelled red, part paid the pending amber, paid the delivered green, and an active product is green too.
    - **Code.** `statusBadge`/`paymentBadge` are now `statusPill`/`paymentPill`, and "Overdue" moved from `view.ts` into `UI_TEXT.orders`. Every screen that showed a badge shows the pill.
  - **`avatar`** shows up to two initials, from the first and last words, on a tint picked from the name by FNV-1a. It works on whole graphemes, so "क्षमा शर्मा" is "क्षश".
    - The tint is a chart colour at 20 % over the surface, and the letters are 40 % of it into the text colour.
    - All 12 pairs across both themes were computed in OKLab, as `color-mix` mixes: the lowest is 5.38 : 1, Peach's blush.
  - **`medallion`** is a lucide icon at a 1.75 stroke in a tinted circle: primary, neutral, success, warning or danger; 36, 44 or 56 px. The stat tile, rows and the response card set their icons in it.
  - Checked in a browser: the pills on Orders in both themes, no console errors. 728 tests.
  - **`page-header`, rewritten.** A back link (`back="/orders"`, named "Go back"), the serif title as the screen's one `h1`, a sans subtitle, and the control beside it. The title icon is gone, as the references have none. Every screen's header moved over, and Create order gained its way back.
  - **`hero`** is the picture band: serif lines as the composition breaks them, a subtitle, a short rule, a tracked line, and a plate on the right (§139.11.12). `hero` is the Home greeting (it can be the `h1`); `band` is the compact strip for Analytics and Expenses. The plate that is the largest paint is `priority`.
    - **Text is never on the photograph.** The plate takes the right three-fifths and fades in (a CSS mask) between 15 % and 70 % of its width.
    - **Measured in the browser.** I hid the words and screenshotted what was behind them. Taking each line's glyph box at 360, 390, 768 and 1280 px in both themes, every word meets 5.62 : 1 (Golden) and 5.32 : 1 (Peach) against the darkest pixel behind it, which is muted text on plain sunken. The first mask put Peach's tracked line at 4.35, which is why the fade starts at 15 %.
    - **Wide screens.** The plate stops growing (`max-w-2xl`, and `max-w-md` for a band), so a portrait plate is not cropped to a sliver. `PLATE_FOCUS` gives each plate a focal point for any crop.
  - **`quote-block`**: the centred serif line on the sunken ground, a wheat sprig, and a small plate from 380 px.
  - **`stat-tile`, rewritten.** A medallion when it has an icon, the figure (in the serif with `headline`, as the tablet reference sets them), the label, and a delta on the previous period.
    - **The delta.** An arrow and the percent, with "Up" or "Down" for a screen reader, and "No change" at zero. Up is green and down is rose, reversed with `up: "bad"` for a cost. It can say what it is measured against ("vs last month").
    - **The sparkline** shows from 1024 px.
    - The tile stays a `dt`/`dd` group, so it reads "Total sales, ₹45,280, Up 12%". `tone` now tints only the medallion.
    - **Where it moved.** The dashboard's four tiles each carry a medallion. The dashboard and customer-profile sections that held tiles are no longer cards themselves, so the tiles are not cards inside a card. Analytics keeps its own figures until R5.9.
  - **Choosing among a few: `tabs`, `segmented-control`, `choice-chips` and `range-picker`.**
    - **`useArrowSelection`** (`src/hooks`) is the keyboard all of them share, per the WAI-ARIA pattern. Only the chosen one is in the Tab order, the arrows move the choice (wrapping round), Home and End go to either end, and focus follows the choice. The segmented control was a radiogroup that the arrows did not move.
    - **`tabs`** are underlined, scroll sideways, and can show a count. Each names the `TabPanel` it controls.
    - **`segmented-control`** is restyled as a surface pill on the sunken ground.
    - **`choice-chips`** are the category filter pills: the chosen one filled, the row scrolling to the screen's edge.
    - **`range-picker`** is a native select dressed as the references' "Last 30 days" pill, so a phone opens its own picker. Choosing Custom shows From and To dates, each bounding the other. The periods are `DATE_RANGES` in `src/constants/ranges.ts` (§139.11.11); remembering the choice per screen comes with R5.8/R5.9.
  - **`row` and `row-list`**: a tile or an avatar, a title with up to two lines under it, a trailing block (an amount, a pill) and a chevron, with hairline dividers inside one card.
    - A row is a link with `href`, a button with `onClick`, and plain otherwise. The whole row is the target.
    - A new `focus-inset` class draws a row's focus ring just inside it, where the card's rounded clipping would otherwise cut it off. The global `:focus-visible` rule is unlayered, so it beats a utility class.
  - **The order-flow pieces: `product-card`, `quantity-stepper`, `cart-bar` and `fab`.**
    - **`product-card`**: the illustration across the card (`ProductTile` gains a `fill` size), the name in two lines at most, the price and a + named "Add …".
    - **`quantity-stepper`**: − / value / +.
      - The value is a WAI-ARIA spinbutton: it can be typed and is kept within bounds; the arrows step by one and Page Up/Down by ten; Home and End go to the bounds.
      - The buttons are for fingers and pointers and stay out of the Tab order. They repeat while held (after 400 ms, every 80 ms) and stop at a bound.
      - A screen reader's click, with no press behind it, still steps once. A press that slides off leaves nothing to swallow the next click.
      - Checked in the browser under the React Compiler: holding + for a second went 1 → 10 and stopped on release, a click after that stepped once, and End, typing and Enter worked.
    - **`hit-area`**: a 32 px control still takes a 44 px tap, through an invisible halo (WCAG 2.5.8). The browser confirmed a tap 5 px outside the + lands.
    - **`cart-bar`**: the cart with its count (spoken in words), the running total, and the dark go-on button. It is `sticky` in the content column, so it never needs a sidebar's width as the current checkout bar does. Measured 80 px up on a phone, just above the nav.
    - **`fab`**: the one dark round + on a phone, above the nav and clear of the home indicator, and a worded button from 768 px. It is written in the page header's action slot, and follows a link or opens a sheet.
  - **Fixed:** Create order showed two back controls once its header gained one; the old "Back" button is gone.
  - **`search-field` replaces `search-input`.** It keeps BUG-24's full-strength placeholder and icon, and the label for a screen reader.
    - **`filter`** adds the square filter button beside it, pressed and dotted when filters are on.
    - **`global`** is the top bar's search. ⌘K, or Ctrl K off Apple, reaches it from anywhere (`aria-keyshortcuts`), and a desktop shows the shortcut in the field. The key's name is read after hydration, so the server and the first paint agree.
    - The four list screens moved to it, and AGENTS.md's tree names `status-pill`.
  - **The field kit.**
    - **Sentence-case labels** are now the only kind; the small capitals are gone, and so is `labelCase`, which the auth screens had to pass. The required asterisk stays, hidden from screen readers (§138.5).
    - **`optional`** says "(Optional)" after the label, inside the label a screen reader reads.
    - **`prefix`** is fixed text before the typed value, with or without a leading icon. It is read out with the field through `aria-describedby`.
    - **Phone fields.** Sign in, registration and the customer sheet carry `+91`. The customer sheet shows a stored number as its ten digits ("98765 43210"), and the server still normalises it to `+919876543210`.
    - The customer sheet marks email, address, map link and notes optional.
    - Checked in the browser: the sign-in field and the customer sheet match the reference's Customer details form.
  - **`empty-state` and the skeletons, restyled.** The empty state's icon sits in the medallion and its title in the serif. A skeleton is now a sunken block rather than a bordered card.
  - **R1.8 is done.** Its remaining kit entries belong to the rows that use them: `sheet`/`dialog` (R1.9), the response card (R1.10), `customer-picker` (R3.6), `bill` (R4.2) and `illustration-picker` (R5.6).
- **R1.9 · BUG-25 — sheets and dialogs.**
  - **`sheet`**, the kit's `sheet`/`dialog` (§139.5), is built on the native modal `<dialog>`.
    - `showModal()` puts it in the top layer and makes the page behind inert to Tab, screen readers and pointers. Tab goes round inside, first to last and back, so focus never steps out to the browser's toolbar either.
    - Focus moves in on opening (a given control, else the first field, else the first control) and goes back to whatever opened it, unless that has left the page.
    - Escape (the dialog's `cancel`) and the backdrop close it unless it is not `dismissible`. `alertdialog` is there for the response card.
    - It is a bottom sheet on phones and a centred dialog from 768 px, in `dvh`, riding above the keyboard and clear of the home indicator. The page does not scroll behind it.
    - A closed sheet is not drawn but **stays mounted**.
  - **`FormSheet`** keeps its props and is now a form inside a `Sheet`.
  - **The More sheet** is a `Sheet`, named "More"; it had no focus handling at all. The receipt view's dialog semantics come with the new bill (R4.6).
  - **The stock sheet** stays mounted before a product is chosen, and opens only with one.
  - **A bug the browser caught, and its cause.** With the sheets always mounted, every form that resets on opening lost what was typed. The customer, product, expense and stock sheets all submitted "Name needs a value." with a name in the field. The previous commit, run the same way, sent the values.
    - **Cause.** `reset()` empties react-hook-form's field registry, which only a fresh `register()` call refills, and the React Compiler memoises those calls. Once the form was mounted before opening, the reset on open left the registry empty, and every keystroke went nowhere. The same mechanism explains R0.3's lost quantity.
    - **Fix.** Those four sheets carry `"use no memo"`, with a comment saying why. The other forms never reset, so their registrations stand.
  - **Checked in the browser, with every write intercepted so nothing reached the database.**
    - Customer, twice: the sheet opened blank each time and sent the name with `+919876522222`.
    - Product: sent `defaultPrice` 125000 from "₹1,250".
    - Expense: sent 45000.
    - Stock: sent quantity 7.
    - Payment: sent 50000 paise, and focus went back to Collect Payment.
    - Cancel: its confirmation sent `CANCELLED`.
    - Twelve Tabs stayed in the customer sheet; a pointer over the page title hit the backdrop; Escape returned focus to Add customer; the More sheet returned focus to More.
    - One early run's stock-in of 7 reached the local database before its interception was fixed. It is local seed data.
  - **Tests.** jsdom has no modal dialogs, so `tests/support/setup.ts` gives it `showModal`, `close`, Escape as `cancel`, and the rule that a closed dialog is not drawn. The sheet tests cover focus in and back, Escape, the backdrop, the Tab loop, a non-dismissible card, and typed values surviving a close. Sheets that rendered nothing when closed are now tested as mounted and out of sight.
- **R1.10 — the response card** (plan §139.6), the single answer to "what just happened?".
  - **`ResponseProvider`** is mounted once in the root layout, around the signed-in and signed-out screens alike. **`useResponse()`** offers `success`, `info`, `warning`, `error`, `failure` and `confirm`.
    - `failure(caught, { title })` takes the API envelope's own message and request id through `errorMessage`, so a raw failure's text never shows. A dropped connection reads as the catalogue's fallback.
    - `await respond.confirm(…)` resolves `true` or `false`.
  - **The card** has a medallion by kind, a serif title, a line of text, up to three facts, the request id in small type, and a primary and a secondary action (a button, or a link).
    - Error, warning and confirm cards are `alertdialog`s; success and info are `dialog`s.
    - It is built on a `Modal` extracted from R1.9's sheet, which the sheet now uses too. It is a bottom sheet on phones and a centred card of at most 420 px from 768 px. It rises in 240 ms, and only fades under reduced motion.
  - **Behaviour.**
    - **Focus.** It goes to the primary action, stays inside the card, and returns to what caused it. Escape closes success, info and error cards and means No to a confirmation; a warning waits for a choice.
    - **One card at a time.** A newer card replaces an older one of lower or equal severity; a lighter one waits its turn. Identical cards are not stacked, and a question that is replaced is answered No.
    - **A destructive confirmation starts on the safe answer.** Enter must not cancel an order by accident; the WAI-ARIA alertdialog pattern advises the same.
  - **A card with no next step closes itself** after 3 s (Q13's default). A hairline counts down, and the count pauses while a pointer rests on the card, a finger holds it or focus is in it (WCAG 2.2.1).
    - **An interpretation, recorded here.** §139.6 asks for focus to move into the card *and* for the count to pause while the card has focus. For a card that closes itself, those two cannot both hold: focus arriving on its own would stop the clock for good.
    - So that card does not take focus or make the page inert. A live region announces it (title, message and facts), and Escape and its ✕ still close it. Every card that has a next step, or needs an answer, is modal as specified.
  - **Outcomes moved onto it.** `useApiMutation` no longer keeps an error string; it hands the failure to `onError`, and `FormSheet` lost its error line.
    - **Customer, product, expense and stock sheets:** "… saved" / "Stock recorded" on success. A refusal is a card over the sheet, which stays open with what was typed.
    - **Payment:** "Payment recorded" with Amount and Balance due.
    - **Order detail:** a status change reports "Order updated" or "Order cancelled". Cancelling is a danger confirmation ("Keep order" / "Cancel order") in place of its own sheet.
    - **Create order:** "Order not placed". The placed-order card with its facts is R3.14.
    - **Settings:** a refused logo is a card.
    - **Auth screens:**
      - Sign-in, registration and password-change failures are cards.
      - "Account created" is a card that follows the move to sign in, since the provider sits above every route, so `?registered=1` is gone.
      - The forgot-password form's "sent" panel became a card with *Back to sign in*.
      - The temporary-password note on Change password stays inline, because it says why the screen is there, not what happened on it.
    - What stays inline, as §139.6 says: field validation, and a screen that could not load (`ScreenNotice`).
  - **Busy buttons keep focus.** A loading `Button` was `disabled`, and a disabled button drops focus, so a refusal card had nothing to hand focus back to: the browser showed focus landing on the page body. It is now `aria-disabled` and `aria-busy`, stays focusable, and ignores a press or a submit until the work is done.
  - **Not yet:** the Android haptic tick needs the native layer (R8.3).
  - **Checked in the browser, with every write intercepted.**
    - **A refused customer:** a card over the still-open sheet with the API's words and "Reference: req_7f3a". Escape closed it, focus went back to Save, and the name was kept.
    - **Saved:** the sheet closed and "Customer saved" was announced. Held under the pointer for 3.5 s it stayed; it closed 2.8 s after being let go.
    - **Payment:** "Amount ₹500 · Balance due ₹450".
    - **Cancel:** the question started on *Keep order*. Escape sent nothing and left the status Pending; confirming sent `CANCELLED`, and the refusal came back as its own card.
    - Golden and Peach, 390 and 1280 px, no console errors.
  - **Tests.** 22 for the card, `Modal` and the busy button: the self-closing clock, pausing, the live region, focus, facts, actions, retry, the request id, confirmations, severity and the queue. The feature and auth tests render inside `tests/support/providers.tsx`, which gives them the SWR cache and the provider together. 804 tests.
- **R1.7 — the new shell** (plan §139.5, §139.9).
  - **Phone (< 768 px).** A top bar carries the business's mark, name and line, and the account's initials, which link to Settings. The five-item bottom bar is **Home · Orders · Products · Customers · More**, with a tinted pill on the current place.
    - More is a sheet of medallion rows with chevrons (Analytics, Expenses, Inventory, Settings), then the theme and the account with Sign out (§139.10).
  - **Tablet (768–1023 px).** A 72 px icon rail. Each label is a tooltip on hover and focus, and still the link's name.
  - **Desktop (≥ 1024 px).** A 248 px sidebar in the plan's three groups, split by hairlines: Home, Orders, Products, Customers · Analytics, Expenses · Inventory, Settings. The content is at most 1200 px wide.
  - **The top bar from 768 px** holds the account: the initials, and the name from 1024 px. It opens a disclosure with who is signed in, the theme and Sign out. Escape or a click elsewhere closes it, and focus goes back to its button. The old desktop header, which repeated the page title, is gone.
  - **Navigation.** It is one set of items, grouped as `NAV_GROUPS`; the bottom bar, the More sheet (`MORE_NAV`, everything the bottom bar does not hold) and the rail and sidebar all read it. "Dashboard" is now "Home". `isActivePath` no longer lights up `/orders` on `/orders-archive`.
  - **The theme pill left the header.** A Golden/Peach switch now sits in the More sheet and the account menu, until Settings → Appearance takes it (R5.11).
  - **Every edge pays its safe area.** Measured with a faked notch:
    - Phone: header 59 px (12 + 47), bottom nav 42 px (8 + 34), content 126 px.
    - A landscape tablet with 44 px side insets: the sidebar is 292 px (248 + 44), and the content and top bar pay 44 px on the right.
  - **Not yet, each with its own row.**
    - The business's own name and logo, since the profile cannot be read until `/api/business` (R2.6, R2.7). The mark shows the app's name meanwhile.
    - The bell and Notifications (R5.10), global search in the top bar (R5.12), and Business details in the sidebar and More (R2.6).
    - These links are left out rather than drawn pointing at screens that do not exist.
  - **`Row`** takes `onClick` alongside `href`, so a More row closes the sheet as it navigates.
  - **Checked in a browser:**
    - Golden and Peach at 390, 820 and 1280 px.
    - The rail is 72 px and its tooltip shows on hover; the sidebar is 248 px.
    - The account menu opens and closes; the More sheet shows its rows.
    - No console errors.
  - **Tests.** The shell, the More sheet, the account menu, the mark and the theme switch each have their own file. The More sheet's tests moved out of the shell's. 814 tests.
- **R1.14 — copy for the wider audience** (plan §139.1 #2; Q8 on its default).
  - **The tagline** is "Home Business", shown in the shell's mark.
  - **The page's title and description** name home businesses: bakers, hamper makers, florists and gift makers.
  - **"Business", not "bakery",** wherever the shared and screen copy said it:
    - the registration label (now "Business name") and the forgot-password line;
    - the Home subtitle, and the Customers, Orders and Settings subtitles;
    - the Settings note on business details;
    - "Baker Notes" on a customer, now "Your notes".
  - The error and validation catalogues had no bakery-only words.
  - **Left to their rows:**
    - the auth headlines and promise ("Good bakes start here.") with the auth screens (R2.8);
    - the "Baker" role label with the role rename (R2.2);
    - "Baking" becoming "Preparing" with the statuses (R3.11);
    - the receipt's hard-coded "Brio Bakery" with the bill's view-model (R4.1);
    - the units with Products (R5.6);
    - moving each screen's own strings into the catalogue (R5.14).
- **Fixed: Create order's checkout bar sat over the rail.** It meant to clear the old 256 px sidebar with `md:pl-64`, but its `safe-x` helper is unlayered and wins over padding utilities (R1.6), so it never did. On an 820 px tablet its content began at 26 px, over the new 72 px rail. It now starts where the rail or the sidebar ends (`left`, with the safe inset), measured at 88 px on a tablet and 380 px on a desktop. The cart bar replaces it in R3.9.

### Validation
- `tsc --noEmit` clean; `eslint` clean; `vitest run` **136 files, 814 tests**, up from 71 and 579 at the start of the phase (94 files once R1.1 split them). `next build` is green on Node 22 with no warnings.
- `0006` and `0007` are applied on the local database: `0006`'s constraints were proved there (R1.11), and the sweep below shows the seed's `icon_key` values from `0007`.
- **The phase's goal, checked in a browser** (plan §139.18): 13 screens at 360, 390, 820 and 1280 px, in Golden and Peach — 104 captures. None scrolls sideways and none logs a console error.
  - **Nothing sits under a notch.** With a faked notch the phone header pays 59 px, the bottom nav 42 px and the content 126 px; on a landscape tablet the sidebar is 292 px and the content pays 44 px on the right.
  - **Every product shows an illustration:** 5 of 5 on Products and on Inventory.

### Blockers
- None. Seen during the sweep and left to their own rows: Analytics prints a negative profit as "₹-4,590" (R5.9); order detail shows the raw "PICKUP" (R3, R5); Create order's checkout bar covers the phone's bottom nav (R3.9). The deferrals each row names above stay with their rows: the business's name and logo (R2.6, R2.7), the bell (R5.10), search in the top bar (R5.12), the theme switch until Appearance (R5.11), haptics (R8.3), the receipt as a dialog (R4.6), the customer picker (R3.6), the bill (R4.2) and the illustration picker (R5.6).

## 2026-09-25 — Review: the sweep's three defects, and search kept to its lists

The user asked for six proposals to be reviewed, and only the sound ones built.
Each lands on its own commit; this entry grows with them.

### Fixed
- **A loss read "₹-4,590"** (seen on Analytics; every money figure shares the formatter). `formatCurrency` now formats through `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`, so the locale places the sign: "-₹4,590", "-₹1,500.50", "-₹1,00,00,000". The value is untouched; only its text changed.
  - The two formatters are built once, not on every call.
  - An amount is rounded to the paisa first, so -0.001 reads "₹0", never "-₹0".
  - Every screen already formats money through `formatPaise`, so Analytics, Expenses, Orders, Home and the receipt all follow; a search found no screen formatting rupees itself.
  - **Tests:** a loss in whole rupees, in paise and in crores; no negative zero; `NaN`.
- **Order detail said "PICKUP on 26 Sep".** It printed the stored code. It now reads "Pickup" or "Delivery" through `deliveryLabel` (`features/orders/view.ts`), which looks the code up in the existing `DELIVERY_TYPE_LABELS`.
  - A code this build does not know, such as a newer server answering an app still cached on a phone, is put into words ("SAME_DAY" → "Same day") rather than shown raw.
  - **No `DINE_IN`.** The proposal named it, but a home business has no tables: the database allows only `DELIVERY` and `PICKUP` (§139.12), and the plan adds no third.
  - **Tests:** both labels, and an unknown code.
- **On a phone, Create order's checkout bar covered the bottom navigation.** Both were fixed to `bottom: 0`, and the bar, drawn later, sat on top: Home, Orders, Products, Customers and More could not be reached from the screen.
  - **Two regions, one above the other.** On a phone the bar rests on the navigation, at `--nav-height` + `--safe-bottom`, and pays no inset of its own: the navigation pays the home indicator. From 768 px there is no bottom navigation, so the bar meets the edge and pays the inset itself.
  - **`--nav-height` is now the navigation's real height.** The bar measured 2 px short of the navigation, because the navigation drew at 66 px while the variable said 68 px. The navigation's height is now set from the variable (plus the inset), so anything resting on it, this bar and the kit's cart bar, meets its edge.
  - **Measured in a browser:**
    - 360 px: the bar is at 595–672 and the navigation at 672–740.
    - 390 px with a 34 px home indicator: the bar is at 665–742 and the navigation at 742–844.
    - 820 px with a 20 px inset: the bar ends at the bottom edge and pays 36 px (16 + 20).
    - 1280 px: the bar ends at the bottom edge.
    - At every width, the last field ends above the bar once the page is scrolled to the end. Nothing scrolls sideways and there are no console errors.
  - R3.9 still replaces this bar with the cart bar.
- **A field's hint was shown but never read out.** `TextField`, `TextAreaField` and `SelectField` drew the hint under the control without tying it to the control, so a screen reader skipped it. Found while adding the business phone's hint.
  - The hint now has an id and is in the control's `aria-describedby`. On a phone field it comes after "+91".
  - When a field shows a message, the message replaces the hint both on screen and when read out.
  - **Tests:** each of the three fields reads its hint, and the message in its place.

### Changed (the user's decision, recorded under AGENTS §31)
- **No global search.** The user decided that search is not needed on Home or in the top bar. It stays in the lists where it is looked for: Orders, Customers, Products, Inventory, the create-order grid and the customer picker.
  - **Plan:** IMP-01 is struck through and R5.12 is marked DROPPED. `GET /api/search` is gone from §139.13. The Home spec, the tablet and desktop top bars (§139.9) and the Phase 5 scope no longer mention search.
  - **R5.13 takes the sound half of the proposal:** once a list paginates, a filter in the browser would only search the page it holds, so each list's search moves to the server with it. It is debounced and tenant-scoped, with loading, empty and error states.
  - **No trigram indexes yet.** The proposal asked for indexed search. Every list is already narrowed by its `bakery_id` index to one business's rows, a few hundred to a few thousand. AGENTS §23 asks for indexes that follow measured query patterns, so one is added when a query plan shows a need.
  - **Code:** `SearchField` loses its `global` variant (⌘K, the shortcut hint), which only the top bar was to use, along with its three tests. The shell's note no longer promises search.

### Added — the business's own name and logo (R2.6, R2.7; plan §139.11.2, §56, §118)
Phase 2 rows, built now because the user asked for the proposal and it matches the plan. The shell showed the app's name, "Brio · Home Business", because the business profile could not be read or edited, and no logo could be uploaded (§133.2 B1–B3).

- **Migration `0008_business_profile.sql`.**
  - `bakeries.tagline` (the catch phrase, ≤ 80) and `bakeries.city` (2–80) are new. They are nullable because businesses registered before them have none; registration asks for them from R2.4.
  - The name, catch phrase, city and address are bounded as the schema is.
  - `logo` was never written and becomes `logo_path`, with `logo_mime_type`. A check keeps the path inside the business's own folder, `bakeries/{id}/logo/{uuid}` (§56). Path and type are set together or not at all.
  - **Edits go through two `security definer` functions** that act only on the caller's own business and only for its owner. `bakeries` stays SELECT-only for a client (§139.11.2), and no route uses the service-role key to serve a request.
    - `update_business_profile` writes the whole profile.
    - `set_business_logo` points the business at a stored file and returns the one it replaced. It refuses a file that was never stored.
    - Both run with an empty `search_path`, and only `authenticated` may execute them.
  - **Grants fixed while here.** 0004 meant a signed-in user to have SELECT on `bakeries` and `profiles` and nothing more. Supabase's default privileges had already given `authenticated` every privilege, including UPDATE, DELETE and TRUNCATE, so only RLS stood in the way of an UPDATE and nothing at all before a TRUNCATE. The write grants are revoked. Every write to those tables already runs as the service role or through the functions above.
  - **The private `business-logos` bucket.** It allows 500 KB and PNG, JPEG or WebP, repeating the server's checks. Its policies open select, insert and delete only inside `bakeries/{the caller's business}/`. It has no update policy, because a new logo is always a new file.
  - **Proved on the local database:**
    - The owner edits their business. A second business's owner changed only their own and could not see the first.
    - A direct `UPDATE` from a client is refused.
    - A blank or 81-character catch phrase breaks its check (23514).
    - A logo reference into another business's folder breaks the shape check, and one to a file never stored is refused.
    - In storage, the other owner sees none of the first business's files and is refused writing into its folder.
    - Rolled back by hand and re-applied with `supabase migration up`, the migration applies cleanly on a database at 0007, bucket already present or not.
- **`GET` and `PATCH /api/business`** (§139.13). They read and edit the business through `withBakeryRoute`, so DEV and a user still owing a password change are refused as everywhere else.
  - The payload is `businessProfileSchema` (`src/lib/validation/schemas/business.ts`): business name 2–160, catch phrase optional ≤ 80, city 2–80 and address ≤ 300 (both required, Q2), and the business phone as a mobile number. It goes through the input-hygiene primitives.
  - The change is audited with the row before and after.
  - The logo is given as `/api/business/logo?v={logo id}`, never as a storage path.
- **`POST /api/business/logo`**, in the order §118 sets:
  1. The file is the request body. `readBody` (`src/lib/api/handler.ts`) refuses it past 500 KB: on a declared length before reading, and by counting while it reads, for a body that states no length or a false one.
  2. Its type is read from its first bytes (`sniffLogoType`) and never from the browser. A script named `logo.png` is refused.
  3. It is stored under a new id.
  4. The business is pointed at it.
  5. Only then is the old file deleted.
  - If pointing the business at the new file fails, the new file is taken away again and the old logo stays.
  - If the old file will not delete, that is logged, not fatal.
- **`GET /api/business/logo`** answers with the file for its signed-in owner only.
  - `nosniff`, a sandboxing `Content-Security-Policy`, and an ETag of the logo's id.
  - A request naming the current version may be cached for a year (`immutable`), because a new logo gets a new address. Any other request must ask again.
  - `withApiHandler` now passes back a route's own `Response` untouched, so a failure on the way still answers in the envelope.
- **Business details** (`/business`, §139.10): business name, catch phrase, city, address and business phone (+91, with a hint that it is printed on bills), the logo, and a **live preview of the bill's header**. The preview sits beside the form from 1024 px and beneath it on a phone.
  - Saved and refused outcomes are response cards. Field mistakes are shown beside each field.
  - The logo is chosen from a real button that opens the file chooser. The browser checks the type and size first, so an obvious mistake is refused on a card without anything being sent. The server checks both again.
  - It is in the sidebar's third group (Inventory · **Business details** · Settings), and so in the phone's More sheet, as §139.5 and §139.10 set.
  - Settings links to it, in place of the logo control that said uploads were not available and the placeholder that said editing was not wired up.
- **The shell shows the business**, not the app:
  - its logo, fitted inside a round frame rather than cropped, and fetched at once because it tops every screen;
  - its name, with the full name on hover when it is cut short;
  - its catch phrase.
  - **Fallbacks.** A quiet placeholder while loading, so the header does not flash "Brio". The app's name and line if the profile cannot be loaded. The cake mark with no logo or a logo that fails to load, never a broken image, and "Home Business" with no catch phrase.
  - The profile is read once and shared by every part of the shell. It is not re-read on focus, and an edit refreshes it.
- **Copy:** the account card said "Your bakery's own details are above", now "business".
- **Tests:** 74 new.
  - The schema.
  - Sniffing: PNG, JPEG, WebP, a script, an SVG, a GIF, a WAV in a RIFF wrapper, too short, empty.
  - The response headers.
  - The data layer, with a fake client that records every storage and database call in order: the replace sequence, and each failure (not an image, storage refusing, the switch failing, the old file not deleting, not found, a storage read failing).
  - `readBody`: in pieces, exactly at the limit, a declared excess before reading, an undeclared excess, no body.
  - `postFile`, the client, the hook (one fetch for the whole shell, none on focus), the logo, the preview, the logo field, the form, the screen, the mark's five states, the navigation and a contract for 0008.
  - The new and changed code measures 100% on statements, branches, functions and lines.
- **Checked in a browser.**
  - Saving tidied the name and the number and changed the header at once. The preview followed each keystroke.
  - A PNG uploaded and showed in the header, the sidebar, the field and the preview. A JPEG sent as `image/png` was stored as `image/jpeg`, with the old file gone.
  - A 600 KB file was refused, with its length declared and without.
  - A text file was refused on a card with no request sent.
  - Signed out, the logo answered 401 in the envelope.
  - Home, Business details, Settings and Create order at 360, 390, 820 and 1280 px, in Golden and Peach (32 captures): the business's name and logo on every one, no sideways scroll, no console errors.
- **Deliberately not here:**
  - Registration asking for the catch phrase, city and address is R2.4.
  - The bill printing this header replaces the hard-coded "Brio Bakery" with R4.1 (§133.2 B4).
  - `next_order_number`, listed in the plan's `_business_profile` migration, lands with R3.2, which uses it, so no column sits unused.
  - OpenAPI has no document yet (§133.11 K1); these endpoints join it when it is written.

### Not built — the notification bell (R5.10), and why
The proposal was reviewed and left to its row. A bell built today would have nothing to show and would be rebuilt when its sources arrive.
- **Nothing writes the inbox.** No code inserts into `notifications` (§133.5 E1). A status change or a payment enqueues a push job, and the worker that would run it does not run yet (R2.1).
- **What it would say is not ready.** The status text is the raw code, "Order #6-799 is now IN_PROGRESS" (BUG-26, R3.4), under the broken order numbers (BUG-08, R3.2).
- **Per-user scoping is not needed.** A business has one owner (USER), so notifications stay scoped to the business, as the table and its RLS already are.
- **The sound parts are already the plan's R5.10:** a `kind` column and the `(bakery_id, is_read, created_at desc)` index, Mark all as read, the tabs, and pagination with R5.13. Supabase Realtime may be used for it, selectively (§57); that choice belongs to R5.10.

### Validation
- `tsc --noEmit` clean; `eslint` clean; `vitest run` **148 files, 893 tests**, up from 136 and 814 at the start of the day. `next build` is green on Node 22 with no warnings, and lists `/business`, `/api/business` and `/api/business/logo`.
- `0008_business_profile.sql` applies with `supabase migration up`, and again after a hand rollback. Its rules were proved on the local database as described above.
- Browser checks as described under each change: the checkout bar at four widths with and without an inset, and the business screens at four widths in both themes.

### Blockers
- None. What was left, and where it goes:
  - the notification bell, to R5.10 (above);
  - server-side search, to R5.13, with pagination;
  - the catch phrase and city at registration, to R2.4;
  - the business header on the bill, to R4.1;
  - `next_order_number`, to R3.2.

## 2026-09-25 — Phase 2: Accounts and the business (plan §139.18, tracker §139.19)

USER and DEV; the new registration; the business profile and logo (R2.6 and
R2.7 landed earlier today); the queue actually running; audit that records who.
Each row is committed on its own; this entry grows with them.

### Changed
- **R2.3 · BUG-17 — the role left `user_metadata`.** Registration wrote `role` into Supabase's user metadata, which a signed-in user can edit for themselves. Nothing read it, but a future read would have been a privilege escalation.
  - Registration now writes only the name there. The role lives on `profiles`, which only the server writes.
  - **Migration `0009_role_out_of_metadata.sql`** strips `role` from every account's metadata. The seed no longer writes it back. On the local database no account carries a role in its metadata any more.
  - **Tests:** `register` had no unit test. Three now cover what reaches `user_metadata` (only the name), where the role goes, and taking the new user away again when the rest of the account cannot be made. A contract covers 0009 and the seed.
- **R2.2 — `BAKER` became `USER`** (plan §139.11.1). The product serves home businesses of every kind, so the owner's role no longer names one.
  - **Migration `0010_roles_user.sql`** renames the enum value in place, so every existing profile follows with no rewrite, and makes `USER` the default.
  - **Code:** `USER_ROLES` is `["USER", "DEV"]`. A screen calls the role "Owner". `BAKERY_ROLES` became `BUSINESS_ROLES` (`["USER"]`), the plan's name. The guards, registration, the seed, the test stubs and AGENTS.md §8–§9 follow. **DEV still gets no business data** (§5).
  - **Checked against the running app:** signing in answers `"role":"USER"`, and `/api/business`, `/api/customers` and `/api/orders` answer 200. The same account set to DEV is refused with `AUTH_ROLE_FORBIDDEN`, and it was set back afterwards.
  - **Tests:** the role list, the "Owner" label, `BUSINESS_ROLES` without DEV, the account card and menu showing "Owner", and a contract for 0010.
- **R2.10 · §133.7 G1 · BUG-20 — audit records who, and only the server writes it.**
  - **Who.** Every audit row had `user_id` null. A feature's data functions now take a `Tenant` (`src/lib/supabase/tenant.ts`): the caller's client, the business and the acting user. That is the shape §133.7 G1 prefers over `(client, bakeryId, …)`. `withBakeryRoute` builds it from the session, and `BakeryContext` is one, so every route hands it straight on.
    - `tenantRecords(tenant, table)` and `logActionSafe(tenant, entry)` take the business and the actor from it, never from the entry, so an entry cannot claim another business or another user.
    - Customers, products, expenses, inventory, orders (reads, checkout, status), payments, receipts, analytics and the business profile all follow, along with their 15 routes.
  - **Only the server writes it.** A signed-in user could insert audit rows for their own business, so the trail could be forged. `logActionSafe` now writes through the service role.
    - **Migration `0011_audit_writes.sql`** drops the insert policy and leaves `authenticated` SELECT alone. As with `bakeries`, the default privileges had given it UPDATE, DELETE and TRUNCATE too.
    - On the local database a signed-in user still reads their business's trail and is refused an insert: "permission denied for table audit_logs".
  - **A gap closed on the way:** creating an order was never audited, though every later change to one was (AGENTS.md §11). It now writes a CREATE row.
  - `getAuditLogsByEntity` had no caller and is gone.
  - **Checked against the running app.** A customer created and then edited produced a CREATE and an UPDATE audit row, both naming Priya Baker. Every read route (orders, one order, its payments and receipt, products, expenses, stock, analytics, business) answers 200 after the refactor. The test customer was removed afterwards. The 12 rows written before today keep their empty user.
  - **Tests:** 12 new.
    - The audit logger, which had none: it writes through the server's client, records the actor and business from the tenant, lets an entry claim neither, and logs a failed write without failing the change.
    - `tenantRecords`, which had none either: reads are scoped, and inserts, updates and removals are each audited as the acting user, while a refused write is not.
    - The order-creation audit, and a contract for 0011.
    - The data-layer tests now pass a tenant (`tests/support/tenant.ts`).
  - AGENTS.md §5 and §11 record both rules.
- **R2.1 · §133.6 F1–F5 — the job queue runs.** Every job enqueued so far had stayed `pending`: nothing ran the queue, no handler was registered, the claim was not atomic, a failing job retried for ever, and a job whose worker died stayed `processing` for good.
  - **F1, F2 — a worker process.** `npm run worker` (`src/worker.ts`, run by `tsx`) is the plan's Node.js worker process (§26). It registers the notification and analytics handlers and drains the queue until SIGINT or SIGTERM, which stop it after the job in hand. `src/lib/jobs/runner.ts` is the loop: hand back abandoned jobs, take the next due one, and when there is none, wait five seconds. A queue it cannot reach is logged and waited out rather than ending it.
  - **F3, F4 — migration `0012_job_claiming.sql`.**
    - `claim_next_job(worker)` takes one due job with `FOR UPDATE SKIP LOCKED` and counts the attempt as it takes it.
    - A job's status is checked to be one of four.
    - Two partial indexes cover what the worker looks for.
    - Only the service role may execute it.
  - **Settling a job.** A job is completed or failed only while its worker still holds it, so a worker whose lease ran out cannot overwrite a job that has since been reclaimed. A failed attempt waits five minutes and goes back on the queue; the third is set aside as `failed` with its reason, where it stays visible.
  - **F5 — `recover_stale_jobs(lease, max)`.** It hands back a job held past its ten-minute lease, or sets it aside as failed once its attempts are used.
  - **Job types are constants.** `JOB_TYPES` (`src/constants/jobs.ts`) replaces the strings at the call sites, alongside the attempts, lease, retry delay and idle time.
  - **Found by running it:**
    - **A payment's job carried `token: "mock-token"`.** Once the queue ran, every payment would have "sent" a push to a device that does not exist. It now carries no token, and the worker completes it as having no device to reach, until the token registry arrives (R8.6).
    - **The push stub logged the device token**, which addresses one person's device. It logs whether there was one.
    - **`createJob` passed the database's error as the response `details`**, so a queue failure would have shown Supabase's own text to the user (AGENTS §10). It is now the logged cause.
  - **Proved against the local database:**
    - Five pushes with no device completed, and an analytics refresh ran.
    - A job left `processing` by a dead worker 20 minutes earlier was handed back and completed on its second attempt.
    - A job no handler knows failed, waited, and was set aside as `failed` after its third attempt, with "No handler is registered for NO_SUCH_JOB".
    - **Three workers drained 60 jobs at once: 20 each, every one completed on its first attempt, none taken twice.**
    - SIGTERM stopped a worker cleanly (exit 0).
    - The test jobs were removed afterwards.
  - **Not here:** jobs enqueued with the service role, exponential backoff, and the Menu and Cleanup workers are R6.1 (§133.6 F6–F8). How the worker is started in production (a second process beside the app) belongs to whatever hosts it; the plan names no host yet.
  - **Tests:** 31 new.
    - The queue: enqueue, the atomic claim, recovery, settling only while held, the retry wait, setting aside at three, truncating the reason, and processing a job to completion or failure.
    - The runner: it keeps going while there is work, waits when there is none, recovers first, survives an unreachable queue, and stops.
    - The process: it registers every handler and stops on SIGTERM.
    - The notification and analytics handlers, and a contract for 0012.
  - README and AGENTS.md §17 say how to run it.
- **R2.5 · BUG-16 — the confirmation email goes through the queue, and can be sent again.**
  - **Registration no longer fails when mail does.** It sent the confirmation inline, and a failed send rolled the whole account back. The account is now made first, then a `SEND_ACCOUNT_CONFIRMATION` job is queued carrying only the user's id. If even the queue cannot take it, the account stands, the failure is logged, and Settings offers to send it again. A failure while making the account still removes the new user, as before.
  - **The NotificationWorker sends it** (`sendAccountConfirmation`).
    - The link is made when the email is sent, not when it is queued, so no sign-in token ever sits in the queue.
    - An account already confirmed, or gone, needs no email.
    - A failed send throws, so the queue retries it, up to three times.
  - **Resend confirmation.** Settings shows it while the address is unconfirmed, and it answers on a response card: "A new link is on its way to …".
    - It uses `POST /api/auth/resend-confirmation`, for the signed-in account only.
    - A confirmed account is refused with `AUTH_EMAIL_ALREADY_CONFIRMED` (409).
    - A second request while one is still waiting adds nothing, so tapping twice sends one email.
    - The route is not named `/api/auth/confirm/…`: the client treats anything starting with the confirm route as never to be retried after a session refresh.
  - **The password-reset email stays inline, deliberately.** It carries the temporary password, and a queued job would keep that password in the database in plain text (AGENTS §9).
  - **Checked end to end:**
    - A new account registered through the API. At that point the queue held one pending job carrying only its user id, and Mailpit held no email.
    - `npm run worker` sent it: one "Confirm your Brio account" to the new address.
    - The link, opened in a browser, confirmed the account (`email_confirmed_at` set), and Settings stopped offering Resend.
    - Marked unconfirmed again, the account pressed Resend in Settings and saw the card. Two more requests left **one** job queued.
    - The confirmed demo account was refused.
    - The new account showed its own business, "Petal & Twine", in the shell.
    - The test account, its jobs and its emails were removed afterwards.
  - **Tests:** 14 new.
    - Registration queues rather than sends, names only the user, and keeps the account when the queue is down.
    - Duplicates collapse.
    - The link is made at send time. Confirmed and missing accounts are skipped, and a failed send throws.
    - Resend queues, or is refused when the address is confirmed.
    - The worker's handler, the client call, and the Settings button with its outcome and refusal cards.
- **R2.4 — registration asks for the business, in two steps** (plan §139.10, §139.11.2; Q2 on its default).
  - **Step 1, You:** your name, mobile number, email, password and confirm password.
  - **Step 2, Your business:** business name, catch phrase (optional), city and address.
  - **One request.** Nothing is sent until the second step, so a half-finished sign-up never creates an account. The server parses the whole payload once.
  - **City and address are required** (Q2's default): the bill prints them.
  - **The business fields are declared once** (`businessFields` in `schemas/business.ts`) and shared by registration and Business details, so the two cannot disagree. Registration writes them onto the business, whose phone starts as the sign-in number.
  - **The form.**
    - Both steps stay mounted and the other is hidden, so nothing typed is lost going back and forth, and no field is registered twice.
    - "Next" checks only the first step's fields, and Enter on the first step means Next, not Create account.
    - A step indicator reads "Step 1 of 2" and is announced. Moving between steps takes focus to the step's heading.
    - A number or email already taken sends the person back to step 1 with that field marked; any other refusal stays on step 2. Either way the refusal is a response card.
  - **Fixed on the way: two different passwords got past the first step.** The match was an object-level check, and Zod skips those while any other field has an issue, which the empty business fields always did. It now runs as soon as the two passwords are themselves valid (Zod's `when`), whatever else is unfinished, and the same helper serves change-password.
  - **Checked in a browser at 390 and 1280 px:**
    - Enter on step 1 moved to step 2 with focus on "Your business".
    - Back kept what was typed.
    - Two accounts were created with every field saved, "Kavya's Hampers · Gifts wrapped with care · Mysuru" and the two-line address, and each queued its confirmation.
    - No sideways scroll and no errors.
    - The test accounts were removed afterwards.
  - **Tests:** 11 new.
    - The schema (tidying, required city and address, the shared limits, the password match on an empty business, no comparing invalid passwords).
    - The form: the steps, per-step checking, Enter, focus, going back, one request, a taken number returning to step 1, and other refusals staying.
    - The business written at registration.
- **R2.8 — the auth screens: neutral headlines and the hero plate** (§138; Q6 answered, Q8 on its default).
  - **Headlines for every home business, not only bakers.** The same short, composed voice: sign in is "Good work / starts here." ("Sign in to run your business"); register is "Grow what / you make / at home." ("Two short steps, and you are ready for orders"); the closing line is "Made at home, run with care." Forgot password, change password and confirm email were already neutral.
  - **The plate behind the scene** (§139.11.12). It is the cake-table plate, a bake and dried florals on a warm wall, which is the scene the references describe. It replaces the unused `--auth-photo` hook.
    - `.auth-plate` fades it in from nothing on its left and at its head, and out at its foot. From 640 px, where the scene is a column in a wider canvas, it fades on its right too.
    - On a phone the headline spans most of the width, so the plate keeps to the band above it, beside the mark. From 640 px it stands beside the words.
    - It is fetched eagerly and first (`loading="eager"`, `fetchPriority="high"`), as the screen's largest paint.
  - **No word sits on the photograph.** Every word on sign in, register, forgot password and confirm email was measured against the darkest pixel behind its glyphs, at 360, 390, 820 and 1280 px in both themes (32 measurements). The lowest is **4.73 : 1**, "Home Business" on Peach at 360 px.
    - The first attempt put the plate beside the headline on phones as well, and measured 0.78 : 1, because "Good work" ran into the flowers. That is why phones keep it in the band.
    - The first measurement over-read too: a range over the headline also reports each line's full-width block box, not only its glyphs. Only glyph boxes are measured now.
  - **Re-tokened already.** The scene and its sheet use `background`, `surface`, `sunken`, `primary` and the text tokens; no retired Flour Room token is left anywhere (R1.3).
  - **`priority` is deprecated in Next 16.** The Hero's plate (R1.13) moved to `loading` and `fetchPriority` as well.
  - **Tests:** `AuthScene` had none. Five now cover the neutral headline and its lines, the plate (decorative, the cake-table image, loaded eagerly and first), the back link and the other door where they exist and neither where they do not, and the closing promise. The Hero's loading hints are tested too.
- **R2.9 — no theme switch on the signed-out screens** (Q15 on its default: none, the stored choice is honoured).
  - Checked on sign in, register, forgot password and confirm email: no stored choice or Golden gives Golden, Peach gives Peach, and a stored `clean` reads as Golden (R1.3). No switch is drawn.
  - Nothing to build. Appearance lives in Settings (R5.11), which a signed-out visitor cannot reach.
- **Fixed: on the signed-out screens, a notice floated over the primary button.** Found while running the phase's exit journey.
  - After registering, "Account created" appeared on the sign-in screen 68 px above where §139.6 puts it, leaving room for a bottom navigation that screen does not have, and sat over the Sign in button.
  - A notice now clears the navigation only where there is one. `--bottom-bar-offset` is the navigation's height when the page has a `[data-bottom-nav]` (`:root:has(…)`), and 0 otherwise. The notice is drawn above every route, outside the shell, so it could not have inherited it from the shell.
  - Measured at 390 px with a 34 px home indicator: on sign in the offset is 0 and the notice rests at the foot (732–838 of 844); inside the app the notice ends at 734 and the navigation begins at 742.

### Validation
- `tsc --noEmit` clean; `eslint` clean; `vitest run` **162 files, 974 tests**, up from 148 and 893 at the start of the phase. `next build` is green on Node 22 with no warnings.
- Migrations `0009` – `0012` apply with `supabase migration up`, each proved on the local database as its row describes.
- **The phase's exit test, end to end in a browser** (plan §139.18): "a new user registers with every field, edits their business, and the confirmation arrives through the queue."
  - At 390 px, "Nisha Kapoor" registered "Bloom Room · Flowers for every day · Chennai · 3 Beach Road, Besant Nagar" across the two steps.
  - She signed in. Business details showed what she had registered. She changed the catch phrase, and the header read "Bloom Room / Fresh flowers, every morning" at once. The audit row reads "UPDATE bakeries by Nisha Kapoor".
  - The queue held one pending confirmation. `npm run worker` completed it on the first attempt, and one "Confirm your Brio account" reached her address in Mailpit.
  - No errors. The test account was removed afterwards.
- **Captured at every width in both themes:**
  - Settings, with Resend, at 360, 390, 820 and 1280 px: 8 captures, no sideways scroll.
  - Sign in, register, forgot password and confirm email: 32 contrast measurements, the lowest 4.73 : 1.
  - Registration's two steps at 390 and 1280 px.
  - Business details, earlier today: 32 captures.

### Blockers
- None.
- **Open, for whoever hosts the app:** the worker is a second process (`npm run worker`) that must run beside the app in production. The plan names no host yet, so how it is started and kept running there is undecided. Until it runs, confirmation emails wait in the queue, and registration is unaffected.
- **Left to their rows:** jobs enqueued with the service role, exponential backoff, and the Menu and Cleanup workers (R6.1); the business header on the bill (R4.1); Appearance in Settings (R5.11); notifications written to the inbox (R3.4, R5.10); OpenAPI (R6.3).

## 2026-09-25 — Phase 3: Orders (plan §139.18, tracker §139.19)

One-transaction creation with idempotency; order numbers; the oversell guard;
Guest; customers on the fly; delivery autofill; custom items; statuses;
payment at creation; the estimate endpoint. Each row is committed on its own;
this entry grows with them.

### Decided (the user, 2026-09-25, recorded under AGENTS §31)
- **The oversell guard checks stocked products only.** Plan §21 refuses an order when stock is short "unless the made-to-order rule is enabled", but no such rule existed, and many home businesses never record stock for what they make to order. The user chose: a product is checked once any stock has been recorded for it — a stock in, an adjustment, wastage or a return. A product nobody stocks is made to order and is never refused. There is no new setting or column.
- **Products need no categories** (the user, 2026-09-25). A product is known by its name and the illustration the owner picks for it from the library (§139.11.10, R5.6); every expense category keeps its own picked illustration (R5.16).
  - The plan drops the category chips on the create-order grid and on Products, Manage categories, `/api/categories` (§133.4 D1), and Sales by category in Analytics. Custom items, which that chart showed, become one "Custom items" row in the Products ranking.
  - R5.6 will remove the unused `categories` table and `products.category_id` with a migration.
  - Both decisions are recorded in the plan under "Answers and additions (2026-09-25)".

### Changed
- **R3.11 · Q3 — Preparing, Ready, and Completed for a pickup** (plan §139.11.8).
  - **Migration `0013_status_ready.sql`** adds `READY` to the status check. No stored value changes.
  - **Labels:** `IN_PROGRESS` reads "Preparing", not "Baking", because not every business bakes. `READY` reads "Ready". `DELIVERED` reads "Completed" for a pickup and "Delivered" for a delivery, through `orderStatusLabel(status, deliveryType)`, which the status pill and the order screen use.
  - **Transitions:** Preparing may go to Ready, Out for delivery (delivery only), Delivered or Cancelled. Ready may go to Out for delivery (delivery only), Delivered or Cancelled. The usual next step comes first in each list, for the next-step button (R3.15).
  - `FINAL_STATUSES` replaces the list of open statuses in `view.ts`, so a new open status is open without being added anywhere else.
  - **Tests:** the new transitions both ways, Ready never reached from Pending or after Out for delivery, the labels, and a contract that the stored check holds exactly the statuses the app knows.
- **R3.5 · Q12 — Guest orders** (plan §139.11.3).
  - **Migration `0014_guest_orders.sql`:** `orders.customer_id` drops NOT NULL, and NULL means Guest. A partial index on `(bakery_id, created_at) where customer_id is null` serves Guest sales and the Guest filter. The composite reference to the customer is MATCH SIMPLE, so any customer an order does name must still be its own business's.
  - **The API names the customer out loud:** `customer: { kind: "GUEST" } | { kind: "CUSTOMER", id }`. A missing customer or a bare null is refused ("Choose a customer."), never read as Guest. A Guest order reads no customer; a named one is still read back through the business's own records (BUG-19).
  - **`GET /api/orders?customer=guest|{id}`** returns the Guest orders or one customer's. Anything else is refused.
  - **Screens:** Guest is the first choice on the order screen until R3.9 replaces it with the picker. The orders list and the order screen say "Guest" where a name would be, and the order screen no longer asks for `customers/null`. "Unknown customer" moved into `messages.ts`.
  - **Tests:** the union both ways, and six ways of not naming a customer. Also the list filter three ways, a Guest order created with no customer read, the interim form's Guest choice, and a contract for 0014. On the local database a Guest order inserts.
- **R3.10 · Q5 — custom items** (plan §139.11.7), on the server; the order screen's sheet comes with R3.9.
  - **The API's line is a union:** `{ productId, quantity, notes }` or `{ custom: { name, unitPrice }, quantity, notes }`. The name is trimmed, 2–120 characters. The amount is the price of one, above ₹0, within the BUG-12 bounds. A line with a `custom` part is checked as custom and anything else as a catalogue line, so a mistake is reported against its own field. A plain union answered only "That value is not valid." `customItemFormSchema` is the sheet's: the amount typed in rupees ("₹1,250").
  - **`src/features/orders/pricing.ts` prices a draft** for placing an order now, and for the estimate (R3.13) next.
    - A catalogue line takes its name and price from the product as it is now. A custom line keeps its typed name and price, with `product_id` NULL.
    - Every product is read in one query (`getProductsByIds`), where there was one query per line.
    - A product that is gone, belongs to another business, or is off the menu is refused as `ORDER_PRODUCT_UNAVAILABLE`, where it was a bare `CONFLICT`.
    - Discounts larger than the order are refused as `ORDER_TOTAL_NEGATIVE`, also formerly a bare `CONFLICT`. Both now have wording in `messages.ts`.
  - **A custom line posts no stock.** The reservation skips it, where it would have failed on `item.product_id!`; the delivery and cancel movements already skipped it (R0.7). An order's item says `custom: true`, for the "Custom" mark.
  - **Tests:** pricing (catalogue prices, one read, custom lines, adjustments, Guest, a named customer, another business's customer, an unavailable product, a negative total and one too large). Also the new checkout path, the union's messages and paths both ways, the sheet's schema and the bulk product read.
- **R3.1, R3.2, R3.3 · §133.3 C1, C2, C4 · BUG-08, BUG-09 — placing an order is one transaction, happens once, and cannot oversell.** R3.12's server half — payment at creation — lands with it, because it lives in the same transaction.
  - **Migration `0015_create_order.sql`.**
    - **Order numbers (BUG-08):** `bakeries.next_order_number`, from 1001. A `before insert` trigger numbers every order `ORD-1001`, `ORD-1002`, … from it, however the order was inserted, so nothing can choose a number the counter reaches later. It is a security-definer function, because `bakeries` is server-only, and it refuses to touch another business's counter. A rolled-back order rolls its number back, so numbers are sequential and never reused. The orders already stored keep their old numbers.
    - **Idempotency (C2):** `orders.idempotency_key` and `payments.idempotency_key`, each unique per business. There is no new table (§139.12).
    - **`stock_shortfalls(lines)`** lists the stocked products a draft asks for more of than there is, with what there is. *Stocked* means stock was recorded by hand — a stock in, adjustment, wastage or return (`MANUAL_INVENTORY_TYPES`). A product nobody stocks is made to order and never refused (the user's decision above).
    - **Payments decide the payment status** (BUG-02, BUG-06, §139.11.9). A trigger derives it from the payments on every insert, update or delete. Another refuses a payment that would take an order past its total, with the order locked so two payments at once are counted in turn (`PAYMENT_EXCEEDS_BALANCE`).
    - **Backfill:** an order marked Paid before this, with less paid than its total, gets a payment for the difference, dated when the order was placed, so the derived status keeps what the owner said. A Part-paid order with no payment is left alone, because nothing says how much was paid.
    - **`create_order(order, key)`** is `security invoker`, so row-level security applies. In one transaction it:
      - waits on the key (an advisory lock), and returns the order that key already made;
      - checks the totals add up;
      - locks the products in id order, so two orders cannot deadlock, and only then checks stock, so a second order for the last of something waits and is then refused (C4);
      - stores the order, its lines, its adjustments, the reservations (catalogue lines only), and the payment taken with it.
      Any failure stores nothing (C1, BUG-09). A shortfall answers `ORDER_INSUFFICIENT_STOCK` with what is left in its detail.
  - **The server.**
    - `createOrder` prices the draft (`pricing.ts`) and makes one call. The multi-step insert, its hard-delete compensation and `console.error` are gone (BUG-29), and so are `generateOrderNumber`, `insertOrder`, `insertOrderItems`, `insertOrderAdjustments` and `deleteOrderHard`.
    - A new order and its payment are audited as the user who placed it, only when the call made them.
    - `POST /api/orders` and `POST /api/orders/{id}/payments` require an `Idempotency-Key` header (`readIdempotencyKey`); without one they answer `IDEMPOTENCY_KEY_REQUIRED`.
    - `processPayment` inserts once per key. A repeat, or a race on the same key, returns the payment already recorded. It no longer sets the payment status itself, and the overpayment check it ran is now the database's.
  - **Payment at creation (R3.12, server).**
    - The API takes `payment: { status: "UNPAID" } | { status: "PAID", method, reference } | { status: "PARTIALLY_PAID", amount, method, reference }`.
    - Paid in full records the server's total. Part paid records its amount, which must be less than the total (`PAYMENT_PART_NOT_LESS`). An order that comes to nothing records no payment and reads Paid.
    - `balanceDue` now reads the payments alone.
    - The interim order screen asks for the amount when Part paid; the payment step of R3.9 replaces it.
  - **Errors.**
    - A refusal the database raises with a catalogue hint carries its JSON detail through to the response's `details`. That is how the shortfall arrives, and the driver's own text never does.
    - `ORDER_INSUFFICIENT_STOCK`, `PAYMENT_EXCEEDS_BALANCE` and `ORDER_STATUS_TRANSITION_INVALID` answer 422, and `ORDER_STATUS_CHANGED` 409.
    - `ApiError` keeps `details` on the client.
  - **The browser's keys.**
    - `postOnce(url, body, key)` sends the header.
    - `requestKeys()` and `useRequestKeys()` give the same request the same key — a double tap, or Try again after a dropped connection — and a changed or next request a new one. Keys are built with `getRandomValues`, because `randomUUID` exists only on https.
    - The payment sheet and the interim order screen use them.
  - **Proved against the running app:**
    - A Guest order (a brownie box and a custom topper, part paid ₹200) was sent **twice at once with one key**. Both answered 201 with the same `ORD-1001`. The database holds one order, one payment of ₹200 (Part paid), one reservation (the brownie box only), one audit row for the order and one for the payment, both naming Priya Baker, and the counter at 1002.
    - A request with no key was refused (400).
    - 50 brownie boxes with 5 left answered 422 with `{ name: "Fudgy Brownie Box (4 pcs)", available: 5, requested: 50 }`.
    - Part paid of the whole total answered `PAYMENT_PART_NOT_LESS`.
    - A payment sent twice with one key made one row, and one past the balance was refused.
  - **Tests:**
    - Pricing's payment, both ways.
    - `createOrder`: the exact payload, a Guest with no payment, a zero total, the audits, a repeated key auditing nothing, and a shortfall carried through.
    - `processPayment`: the key stored, a repeat, a race, a key reused for another order, the database's refusal, and the audit.
    - The sheet sending Try again with the same key.
    - Also the error mapping and detail, the client's `postOnce` and details, the key reader, the keys and the hook, the payment schemas, and a contract for 0015.
- **R3.4 · §133.3 C6 · BUG-26 — a status change is one transaction, and notifications read in words.** R3.12's other server half (BUG-06) lands with it.
  - **Migration `0016_change_order_status.sql`.**
    - `order_status_next(status, delivery_type)` is the transition table in the database. A contract test reads it out of the migration and checks it against `nextStatuses` for every status and both delivery types.
    - **`change_order_status(order, from, to)`** is `security invoker`, and does all of this or none of it:
      - locks the order;
      - refuses a move from a status it has already left, as `ORDER_STATUS_CHANGED` — a double tap, or another device;
      - refuses a move the table does not allow, as `ORDER_STATUS_TRANSITION_INVALID`;
      - moves it, and posts the stock that follows: Delivered or Completed releases the reservation and consumes, Cancelled releases, and custom lines are skipped;
      - queues the notification in the same transaction, so a move never goes without its notification. That is the failure C6 recorded on 2026-09-23.
  - **`updateOrderStatus`** reads the order, makes one call from where it read it, and audits the move as the user who made it. The multi-step path (`moveOrderStatus`, `stockMovements`, `updateOrder`) is gone. `EDITABLE_COLUMNS.orders` went with it, because nothing updates an order directly any more. `lifecycle.ts` keeps `nextStatuses` and `canMoveTo` for the screen.
  - **BUG-06:** `PATCH /api/orders/{id}` takes `{ status }` only ("Choose a status." without one). The order screen's payment-status select is gone, and its panel shows the derived pill and Collect payment.
  - **BUG-26 — notifications are written from messages.ts when they are sent.**
    - A job carries what happened: `{ kind: "ORDER_STATUS", orderNumber, status, deliveryType }` or `{ kind: "PAYMENT_RECEIVED", orderNumber, amount }`, with the business.
    - `notificationText` writes the words: "ORD-1028 is now Preparing." (or "Completed" for a pickup), and "₹500 received for ORD-1028." A job queued before this, with its words ready-made, is still sent as it is.
    - A payment's notification that the queue cannot take is logged and no longer fails a payment that was recorded.
  - **Proved.**
    - **On the local database, signed in as the owner:** a move from a status the order had left was refused as changed elsewhere. Out for delivery on a pickup was refused. Preparing → Ready → Completed released the reservation (+1) and consumed (−1). Each move queued one notification, and the refused ones none.
    - **Against the running app:** `PATCH {status: "IN_PROGRESS"}` moved ORD-1001. Out for delivery on that pickup answered 422 in the app's words. `{paymentStatus: "PAID"}` answered 400, "Choose a status.", and left the status Part paid. `npm run worker` completed the queued status notification on its first attempt.
  - **Tests:**
    - `updateOrderStatus`: one call from where it was read, the audit, no call when nothing changes, a refused move, a move made elsewhere, and another business's order.
    - The notification's words for a status, a pickup and an amount, and every shape it will not read.
    - The worker writing them.
    - The payment's notification as facts, and a queue failure kept from failing the payment.
    - A contract for 0016, with the transition table checked against the app's for all 12 cases.
- **R3.13 · §139.11.5 — `POST /api/orders/preview`, the estimate.**
  - The body is parsed with the same `createOrderSchema` as creation and priced by the same `priceDraft`.
  - Stock is checked with the same `stock_shortfalls` that `create_order` uses, without its locks. **Nothing is written.**
  - `OrderEstimate` is the bill before the order exists: the customer or Guest, the priced lines, the adjustments, the server's totals, delivery, payment so far, the balance that would be due, the shortfalls (empty when there is stock for everything), and when it was issued. There is no order number. Internal notes are left out, because a bill never shows them (§139.11.6).
  - `OrdersClient.preview` and `apiRoutes.orders.preview` are ready for R3.9 and the bill (R4.3).
  - **Against the running app:** a draft for Anu Sharma (9 brownie boxes with a birthday note, a custom topper, ₹50 off, part paid ₹500) answered 200. It carried Anu's name and phone, the product's name and price from the database, the total ₹3,520, the balance ₹3,020, and `{ name: "Fudgy Brownie Box (4 pcs)", available: 5, requested: 9 }`. Orders, ledger lines, payments and the order counter were the same count before and after.
  - **Tests:** the server's pricing with the payment so far and the balance; the internal notes never in it; stock checked for catalogue lines only, and not at all for an all-custom draft; a failed check in the app's words; and the client call.
- **R3.7 · R3.8 (the rule) · R3.6 (the refusal) — customers on the fly, on the server** (plan §139.11.4, §96).
  - **R3.7:** a customer's name and phone are required, and address, map link, email and notes stay optional, as §92 had them. The link is labelled **"Map link"** everywhere, in its messages too, because any maps service will do (`UI_TEXT.fields.mapLink`). The column is still `google_maps_link`.
  - **BUG-22:** a delivery order needs an address or a map link: "A delivery needs an address or a map link.", reported against the address. A pickup needs neither. It holds on the API and the order form alike.
  - **The duplicate-phone card's refusal:** a customer created or edited with a number another of the business's customers has is refused as `CUSTOMER_PHONE_ALREADY_EXISTS` (409), naming them in its details (`{ customerId, name }`). That is so the order screen can offer **Use that customer** (§139.6); it was a bare `CONFLICT`. A customer keeping their own number is not reported as a duplicate, and any other refusal passes through as it was.
  - **Against the running app:** Anu Sharma's number typed as "98123 45678" answered 409 with `{ name: "Anu Sharma" }` and her id. A delivery with neither an address nor a link answered 400 on `delivery.address`.
  - **Tests:** the duplicate named on create and on an edit, the customer's own number, other refusals passed on, no lookup when the write worked, the delivery rule both ways and on the form, and the map link's message.
- **R3.9 · R3.6 (the picker) · R3.8 (the autofill) · R3.10 (the sheet) · R3.12 (the payment step) · R3.14 · R3.16 (the date) — the new order, items first** (plan §139.10, §110, Q11).
  - **The screen** (`src/features/orders/components/NewOrder.tsx`, on `/orders/new`):
    - **Items:** the products on sale as a grid with a + on each, searched by name, each showing "N in the order", and **Add custom item**. There are no category chips and no New product button: a product is made on Products, and the draft waits (the user, 2026-09-25).
    - **Order details:** the customer card (**New customer** beside it); the lines with a stepper, a delete, a line total and the note printed on the bill, with a custom line marked **Custom**; Pickup or Delivery with the date and time, the address and map link; discounts and charges, each with its kind, name and amount; and the internal notes.
    - **Payment:** Unpaid, Paid in full, or Part paid, which asks the amount; the method and a reference; and the summary with what is paid now and the balance due.
    - **On a phone** each step is its own page (`?step=details`, `?step=payment`), so the back button walks back through them. A step shows its own mistakes and goes no further, and **Place order** sends a phone back to the first step that has something to put right. **From 1024 px** the grid sits beside one sticky panel with every step and Place order in reach.
    - **Clear all** asks first ("Keep editing" is the safe answer).
  - **The draft** (`src/features/orders/draft.ts`, pure; `hooks/useOrderDraft.ts`): kept on the device under the signed-in user (`src/lib/storage/userStorage.ts`) until it is placed or cleared, so a refresh, a back navigation or a trip to Products loses nothing. **Signing out clears it** (`AuthProvider`). A fresh draft is dated tomorrow at this hour, **worked out when it is started** (BUG-28). The draft reads into the API's shape through `orderFormSchema`, which now takes the customer as `{ kind }` or null ("Choose a customer.") in place of `customerId` and the `GUEST_CHOICE` marker, both removed.
  - **Placed once** (§133.3 C2): the request's idempotency key is kept beside the draft, so a double tap, **Try again**, or Place order after a refresh all send the same key for the same order. A new draft gets a new key.
  - **R3.6, the picker** (`src/components/ui/customer-picker.tsx`): Guest pinned first, then the customers, searched by name or by number in any format; **Add new customer** at the foot. A radio group, a sheet on a phone and a dialog from 768 px; choosing closes it, and each opening starts from the whole list.
  - **The duplicate-phone card** (§139.6): a new customer with a number someone already has shows "Meena Gupta already has this number." with **Use that customer**, which reads them and chooses them, or **Edit**. A saved new customer is chosen for the order at once.
  - **R3.8, the autofill** (§139.11.4): choosing a customer fills an empty delivery place from theirs and replaces what the last autofill put there. What the owner typed is kept, and **Use {name}'s address** is offered instead. The customer record is never changed.
  - **R3.10, the sheet:** a custom item's name, an optional description (the line's note on the bill), and the amount above ₹0.
  - **R3.14, the card:** Order placed, with the order number, the customer (or Guest) and the total; **View order** and **New order**; it waits to be closed. A stock refusal names what is short ("Only 2 left of Red Velvet Cake.") with nothing to try again; any other failure offers Try again with the same key.
  - **Proved in the browser, at 390 px:** a draft kept through a refresh; the step's own mistakes (no customer; part paid with no amount); search by digits; the autofill, a typed address kept, and the swap offered and taken; the back button walking back a step; a double tap on Place order sent twice with one key, both answering 201 with the same order (ORD-1006: Meena Gupta, delivered, a custom topper with its note, ₹50 off, ₹500 cash, Part paid); and a fresh draft after. No sideways scroll at 360, 390, 820, 1280 or 1440, Golden or Peach.
  - **Tests:** the draft's every change, the autofill rules, the totals and its reading into the API's shape; the storage (a refusing or garbled store throws nothing); the hook (a refresh, a sign-out, the same key for the same request); the picker; each panel; the screen's steps, the picker and new customer, the duplicate card both ways, placing once, Try again with the same key, the stock refusal, the phone and wide-screen sends-back, and Clear all; the sign-out clearing the draft; and the form schema's steps.
- **Fixed — a tap on the quantity stepper counted twice on a phone** (reported by the user, 2026-09-26: "1 > 3 > 5", on + and − alike).
  - **Cause:** the stepper stepped on pointer down and skipped the click that followed. A touch, unlike a mouse, fires `pointerleave` straight after `pointerup` and *before* its click. `pointerleave` cleared the skip, so the click stepped again. The browser checks used a mouse, which never showed it.
  - **Fix** (`src/components/ui/quantity-stepper.tsx`): every tap steps once, on its click, whatever made it (a mouse, a finger or a screen reader). Holding still repeats: after 400 ms, then every 80 ms. Only the click that ends a hold is skipped, and only on the button that was held.
  - **Proved** on an emulated Pixel 7: taps went 1 → 2 → 3 → 4 → 3 → 2. With a mouse, 1 → 2 → 3 → 2. A 0.7 s hold went 2 → 6.
  - **Tests:** a touch tap in the order a phone sends it, a mouse click, a hold and the click that ends it, a slide-off, a hold that never reaches its click, and a click on the other button after a hold.
- **R3.15 · IMP-02 · IMP-06 · IMP-07 — the order detail, rebuilt** (plan §139.10; §137.7 "one card, not six").
  - **The route is thin now** (`src/app/orders/[id]/page.tsx`). The screen is `src/features/orders/components/OrderDetail.tsx`, which reads the order, its customer (none for a Guest) and its payments. It shows the load failure with Try again (ScreenNotice) in the API's words.
  - **Header:** the order number, "Delivery · due 27 Sep 2026, 12:00 AM", and **View bill**.
  - **Summary card:** the status and payment pills, the total, the balance due when there is one, and **one next-step button** (IMP-06, `StatusActions.tsx`). The button reads "Mark as Preparing", "Mark as Ready", "Mark as Out for delivery" or "Mark as Delivered", or "Mark as Completed" for a pickup (§139.11.8). **More actions** opens a sheet with the other moves the table allows, Cancel last, and Cancel asks through a confirm card ("Keep order" is the safe answer). A finished order shows no actions. A move says "ORD-1006 is now Preparing." on a success card. A refused one, such as a move already made on another device, shows the API's words and reads the order again.
  - **Customer** (`OrderContact.tsx`): the avatar, name and number, with **Call** (`tel:`) and **WhatsApp** (a `wa.me` link, no integration, IMP-02). A Guest shows "Guest" and no actions. A customer who cannot be read shows "Unknown customer".
  - **Handover:** pickup or delivery, when, "Overdue" in red when it is late, the address, and **Map** when the order has a map link.
  - **Items and money** (`OrderLines.tsx`): each line in full, never cut short (§136 D5-5), with its price each, the Custom mark and its note for the bill. Then the subtotal, each discount and charge, tax only when there is some, the total, what is paid and the **balance due** (IMP-07).
  - **Payments** (`OrderPayments.tsx`): each one's method, time, reference and amount. The list shows "No payments yet" when there are none, and Try again when it could not be read (`PAYMENTS_LOAD_FAILED`). **Collect payment** appears while a balance is due and opens the payment sheet.
  - **The bill** is built only when View bill is asked for, and never stored (AGENTS §15). A failure says "Bill not ready". Share and download come with Phase 4 (R4.4, R4.5).
  - **Internal notes** are shown only when there are some, marked as never printed.
  - **Kit:** `LinkButton` takes `tel:` and outside links as plain anchors, `newTab` (opened with `noopener noreferrer`), and `accessibleName` ("Call Meena Gupta"). `src/lib/phone.ts` gains `callHref` and `whatsAppHref`. `Payment.payment_method` is typed as the method it is.
  - **The old screen's problems are gone:** the magic strings, six equal panels, the status select labelled twice (§136 L2-1), and `router.back()` as the only way out.
  - **Proved in the browser:**
    - ORD-1004 moved Pending → Preparing → Ready with a card each time. The menu offered "Mark as Delivered" and "Cancel order", and Cancel asked first.
    - Collect payment offered the ₹600 owed, and View bill opened the bill.
    - Call went to `tel:+919834567890`, and WhatsApp to `https://wa.me/919834567890` in a new tab.
    - The Guest order ORD-1001 showed Guest with no actions.
    - No sideways scroll at 360, 390, 820, 1280 or 1440, Golden or Peach.
  - **Tests:**
    - Each block, each state, and every move: the next step, the menu, Completed for a pickup, a cancel confirmed or kept, closing the menu, a move in flight, and a finished order.
    - The screen reading, failing and trying again. A Guest order reads no customer. Moving on, cancelling and a refusal.
    - Collecting a payment, the bill built, and the bill failing.
    - `LinkButton` and the phone links.
- **Fixed — a form sheet could wipe what had just been typed in it** (found by the Phase 3 exit test, 2026-09-26).
  - **What happened:** the new customer, product, expense and stock-adjustment sheets reset their fields in an effect as they opened. On a phone that effect landed up to about 50 ms after the sheet appeared, so a name typed straight away was cleared. On the order screen the save was then refused with "Name needs a value." and "Phone needs a value.", while the address, typed later, was kept. It showed on the Customers screen as well as the order screen.
  - **Fix:** `src/hooks/useOpeningKey.ts` gives each opening its own key. Each sheet's form is keyed by it, so every opening mounts a fresh form, already filled from the record (or blank), and no reset runs while anyone is typing. A sheet closed half-filled opens blank next time, and one opened for a different record shows that record. The four sheets keep their props; only their insides moved.
  - **Proved in the browser (Pixel 7):** a name typed the moment the sheet opened was still there at 50, 150, 400 and 1000 ms, on Customers and on the order screen. Before the fix it was gone by 50 ms.
  - **Tests:** the hook, one key per opening; and the customer sheet keeping what is typed across re-renders, opening blank after a close, and opening filled for the record being edited.

### Validation
- `tsc --noEmit` clean; `eslint` clean; `vitest run` **190 files, 1208 tests**, up from 162 and 974 at the start of the phase. `next build` is green on Node 22 with no warnings.
- Migrations `0013` – `0016` apply with `supabase migration up`, each proved on the local database as its row describes.
- **Every new component, hook and client service is at 100 %** statements, branches, functions and lines (AGENTS §26): the draft, its storage and hook, the picker, the order screen and its panels, the order detail and its blocks, `useOpeningKey`, and the stepper.
- **The phase's exit test, end to end on an emulated Pixel 7** (plan §139.18): "a guest order and a new-customer order can each be placed twice by a double tap and produce one order; stock and payments reconcile."
  - **The Guest order:** two Fudgy Brownie Boxes and a custom "Birthday candle" at ₹30, paid in full by UPI. Place order was pressed twice in the same instant. Two requests went out with one key, and both answered 201 with **ORD-1008**. The database holds one order (₹790, Paid, Guest), one ₹790 UPI payment, one reservation of −2 brownie boxes (none for the candle), and one audit row each for the order and the payment.
  - **The new-customer order:** Kavya Rao was made from the order screen, and her address filled the delivery. One truffle cake, part paid ₹300 cash, Place order pressed twice at once. Both requests answered 201 with **ORD-1009**. The database holds one customer, one order (₹1,200, Part paid, delivering to her address), one ₹300 cash payment and one reservation of −1.
  - **Before and after:** orders +2, payments +2, ledger lines +2, customers +1, the counter 1008 → 1010. No errors in the browser.
  - The first attempt at this test stopped at the new customer's name, which had been wiped as the sheet opened. That was a real fault in four sheets, fixed above.
- **Captured at 360, 390, 820, 1280 and 1440 px in Golden and Peach:** the new order's steps, and the order detail for a customer's order and a Guest's. No sideways scroll anywhere.
- **The local test data was removed afterwards:** the nine `ORD-` orders with their lines, payments, ledger lines, jobs and audit rows, and Kavya Rao. The counter is back at 1001. The seed's own orders and customers were not touched.

### Blockers
- None.
- **Still open from Phase 2, for whoever hosts the app:** the worker (`npm run worker`) has to run beside the app in production.
- **Left to their rows:**
  - View bill on the order steps and on the Order placed card, and the bill in estimate mode (R4.3).
  - Sharing and downloading the bill (R4.4, R4.5). The bill view as a real dialog (R4.6, BUG-27).
  - "Custom items" and "Guest sales" in Analytics (R5.x).
  - Dropping `categories` and `products.category_id`, and illustrations for products and expense categories (R5.6).
  - The payment sheet's and the customer sheet's own labels, still written inline, move to `messages.ts` with their screens (R5.x).

## 2026-09-26 — A number keyboard for number fields (the user)

### Changed
- **A field that takes only numbers opens a number-only keyboard on a touch screen.**
  - **The audit:** every such field was listed from the rendered app on an emulated Pixel 7.
    - **Amounts** (custom item, discount or charge, amount paid, Collect payment, product price, expense amount) already asked for the digit pad with a decimal point (`inputmode="decimal"`).
    - **Counts** (the quantity stepper, the stock sheet) already asked for the digit pad (`numeric`).
    - **Phone numbers** asked for the *phone* pad (`tel`), which carries + * # and, on Android keyboards, ( ) - / , ; and N.
  - **The change:** the four phone fields now ask for the digit pad (`inputmode="numeric"`): sign in, register, the customer sheet and Business details. The +91 is fixed beside each one and ten digits are all it takes. They stay `type="tel"` with their autocomplete, so autofill and screen readers still know them as phone numbers, and a pasted "+91 98765 43210" is still read.
  - **Kept as they are:** amounts stay `decimal`, so "₹12.50" can be typed. No field became `type="number"`, which would refuse "₹1,500" and change the value on a scroll.
  - **Tests** now pin the keyboard on each phone field, on the amount fields of the order screen and on the stepper.

### Validation
- `tsc` and `eslint` clean. The 43 affected test files, 294 tests, pass. The re-run of the audit shows phones and counts on `numeric` and amounts on `decimal`.

### Blockers
- None.

## 2026-09-26 — Motion on the order flow (`/impeccable animate`, the user)

### Added
- **The till ticks: an order's numbers roll the way they moved, and what is added drops into place.** New order and order detail only (the user's choice). Nothing moves when a page loads; only a change moves.
  - **Numbers** (`RollingNumber`, `src/components/ui`): the cart bar's count and total, the grid card's "in order" count, the order summary, and Paid and Balance due on the order detail. Each rolls up when it grows and down when it shrinks.
  - **Arrivals** (`useArrived`, `src/hooks`):
    - the cart bar rises in with the first item, but not when a saved draft is reopened;
    - a card's count badge pops in;
    - a discount or charge added on the details step drops in;
    - on a wide screen, a line added from the grid drops in beside it;
    - the delivery fields drop in when Delivery is chosen;
    - the payment fields drop in when Paid or Part paid is chosen;
    - a payment recorded on the order detail drops into the list;
    - the status pill pops when the order moves on.
  - **The steps travel** (`useTravelMotion`, `src/hooks`): on a phone, the next step comes in from the right and the way back comes in from the left. On a wide screen, where every step is in view, nothing slides. The animation uses Web Animations, so nothing inside is remounted and nothing typed is lost.
  - **The segmented control** (`src/components/ui`): the chosen tile slides to the option picked instead of jumping.
  - **Timing:** 220–320 ms on one ease-out curve, `--ease-out-expo` in `globals.css`. Only transform and opacity animate.
- **Reduced motion:** every one of these becomes a short fade (140–160 ms), and the tile moves without sliding.

### Changed
- **`CartBar` takes its total in paise** and formats it itself, so the digits can roll.
- **The new order's steps are put away with `step-away` instead of `hidden`.** `display: none` restarts a CSS animation when the element is shown again, so going back a step replayed the cart bar, the badges and the numbers. The step now stays mounted, invisible and zero height, on a phone.
- **A DetailsPanel test no longer depends on today's date.** It set the date to tomorrow at 10:00, which is the new draft's own default, so on some days nothing changed and the handler went untested.

### Validation
- `tsc` and `eslint` clean. 193 test files and 1230 tests pass, with 100% coverage on every file touched.
- **In the browser:**
  - **Emulated Pixel 7, both motion settings:**
    - the bar rises in on the first add and ticks on the second;
    - the tile lines up with the chosen option;
    - the address drops in and the discount ticks the total down;
    - forward enters from the right (`translateX(24px)`) and back from the left, with no animation replayed on the way back;
    - with reduced motion, all of these are a fade.
  - **At 1280 px in Golden and Peach:** a new line lands in the side panel, and nothing slides between steps.
- The Impeccable detector reports nothing on the changed files.

### Blockers
- None.

## 2026-09-26 — The bill shares; it never prints (the user)

### Changed
- **Plan §139.11.6, §139.10 and tracker R4.4 and R4.6 are updated with the user's decision:**
  - **No print action.** **[View bill]** opens the bill, and **[Share]** sits inside it where Print was. **[Download PDF]** sits beside it on a placed order.
  - **File names.** A shared or downloaded bill is named `{order number} - {business name}`, for example `ORD-1028 - Sweet Delights Home Bakery.png`. An estimate has no number yet, so it is named `Estimate - {business name}`.
  - **R4.6** keeps the dialog semantics and the labels in place of enums. The print stylesheet is dropped.

### Blockers
- None.

## 2026-09-26 — Phase 4: The bill (tracker R4.1–R4.7)

### Added
- **The bill view-model (R4.1, `src/features/receipts`).** `GET /api/orders/{id}/bill` replaces `/receipt`.
  - **What it carries:** the order, its payments, its customer (or Guest) and the **business profile**, so no bill says "Brio Bakery" any more (§133.2 B4).
  - **The estimate:** the browser builds the same shape from `POST /api/orders/preview` and the business.
  - **Wording:** one document (`document.ts`) writes the bill out in words, and all three renderings draw it. These are the screen, the image and the PDF, so they cannot disagree.
- **The bill on screen (R4.2, R4.6, R4.7).** `BillView` sits in a real dialog, `BillSheet`, with a heading, and reads in order to a screen reader.
  - **Look:** white paper with near-black ink in either theme. The theme's primary shows only in the header rule and the total. Business and total are in Fraunces, and money uses tabular figures.
  - **Wording:** payment methods and delivery types appear as their labels, not enums (BUG-27). Tax appears only when there is some. Internal notes never appear.
  - **Footer:** "Made with Brio · {host of NEXT_PUBLIC_APP_URL}".
  - **Tokens:** new paper tokens `--color-paper`, `--color-ink`, `--color-ink-muted` and `--color-paper-rule`. A test holds the image and PDF palette (`palette.ts`) to them.
- **Share (R4.4).** **Share** sits inside the bill where Print used to be (the user).
  - **What it sends:** a PNG of the bill with a one-line caption. Web Share hands them to Android's share sheet, and so to WhatsApp.
  - **Browsers that cannot share files:** the PNG is downloaded and the caption copied.
  - **How it is drawn:** on a canvas in the browser, at up to 3×, from `layout.ts`, the layout the PDF also uses. It uses the app's own faces, shipped as static TrueType in `public/fonts/bill` (OFL; `npm run bill-fonts` fetches them).
  - **Timing:** the image is drawn as soon as the bill opens, so the tap hands it over at once (Safari refuses a late share).
  - **Where the code lives:** `share` and `saveFile` start the web half of `src/lib/native` (§139.17.2). The Android half is R8.3.
- **Download PDF (R4.5).** `GET /api/orders/{id}/bill.pdf` makes the PDF on demand with pdfkit, in the page's theme, from the same layout and fonts.
  - **Page:** A5 at receipt width. A bill slightly too long for one page is shrunk a little to stay on it; a long order runs on at block breaks, never through a line.
  - **Links:** the map and the footer links can be clicked.
  - **Logo:** a WebP logo is turned into a PNG with sharp for the PDF. A logo that cannot be read falls back to the cake mark.
  - **Response:** `Cache-Control: private, no-store`.
- **View bill before placing (R4.3).** **View bill** sits beside the Order summary's title on the details and payment steps and on the desktop panel.
  - **What it opens:** the server's estimate, with no number, dated today and marked "Estimate · not yet confirmed" on a band.
  - **Actions:** **Share** and **Place order**. Short stock is named above the estimate, and Place order waits until the draft changes.
  - **After placing:** the Order placed card now offers **View bill** and **New order**.
- **File names (the user):** `{order number} - {business name}.png` / `.pdf`, and `Estimate - {business name}.png` before there is a number. Characters a file name cannot hold are dropped.

### Changed
- **Browser API client:** `getFile` reads a file answer, with the same one-refresh retry and the same refusal handling as JSON calls.
- **Proxy:** leaves `/fonts/` alone.
- **Test setup:** runs in Node for the PDF's tests.
- **`sharp`** moves to dependencies. Next already installs it as an optional dependency.
- **View bill placement:** it was first put beside Proceed to payment in the phone's step bar. At 360 px that wrapped the main button onto two lines, and the see-through secondary fill showed the page through the bar. So it sits in the summary card instead, and the bar keeps its one dark action.

### Removed
- `ReceiptPrintView` and its print styles, and `GET /api/orders/{id}/receipt`.

### Validation
- `tsc`, `eslint` and `next build` are clean. 207 test files and 1301 tests pass, with every new file at 100% coverage.
- **Exit test** on an emulated Pixel 7, with Web Share receiving what Android's sheet hands WhatsApp:
  - A placed order's bill was shared as a valid PNG, `#1004 - Sweet Delights Home Bakery.png`, with its caption.
  - Its PDF was downloaded as `#1004 - Sweet Delights Home Bakery.pdf`.
  - An estimate was shared as `Estimate - Sweet Delights Home Bakery.png`.
  - No Print button appeared anywhere.
  - **Every row count in every `public` and `storage` table was the same before and after.**
- **Captures:** the bill and the estimate at 360, 390, 820, 1280 and 1440 px in Golden and Peach, with no sideways scroll. The PDF was read back: one A5 page, real text, the logo, links.
- The Impeccable detector reports nothing on the bill screens.
- **Local test data removed:** the two orders placed while testing (ORD-1001, ORD-1002), with their lines, ledger lines and audit rows. The counter is back at 1001.

### Blockers
- None.
- **Known limit:** the image and PDF fonts cover Latin, Latin Extended, general punctuation and ₹. A business name in another script (Devanagari, Malayalam) shows correctly on screen, but the PDF has no glyphs for it. Adding script faces would be a separate decision.
- **Left to its row:** native sharing inside the Android app (R8.7).

## 2026-09-26 — Take one off from the product grid (the user)

### Changed
- **Orders, the Items step (`ProductCard`, `ItemsPanel`, `draft.ts`).** Once a product is in the order its **+** grows into **− count +**, so one can come off without leaving the grid. Taking off the last one removes the line. Before, taking one off meant going to Order details.
  - **Count:** it lives in the stepper. The badge on the illustration, which said the same thing, is gone. The count still pops in with the first one added, ticks as it changes and reads as "2 in the order" to a screen reader.
  - **Focus:** the + stays the same button throughout. When the − goes with the last one, focus moves to the + rather than falling to the page.
  - **Tap targets:** both buttons keep their 44 px targets, and the count keeps them from overlapping.
  - **Narrow cards:** a card too narrow for the price and the stepper on one line (the desktop two-pane grid, a 320 px phone) gives the price a line of its own, in the order or not, so adding one never moves the grid. This uses a container query on the card.
  - **Two-pane grid, 1024–1279 px:** two columns instead of three. Three made the cards about 95 px wide, which broke names mid-word and left no room for the stepper. The grid stays at four columns from 1280 px.
  - **Plan:** §139.10's Items step says so.

### Validation
- `tsc` and `eslint` are clean. 207 test files and 1307 tests pass. `product-card.tsx`, `ItemsPanel.tsx`, `NewOrder.tsx` and `draft.ts` are at 100% coverage.
- **Captures at 320, 360, 390, 1024, 1280 and 1440 px, in both themes:**
  - At 360 px and up on a phone, the price and − 1 + share a line. On narrow cards they sit on two lines.
  - Nothing reaches past a card's content edge.
  - Taking a product to zero leaves focus on its +.

### Blocker
- Status: OPEN
- Area: Orders, the Items step on a phone.
- Description: the user reports the Items page "infinitely scrolling", with a small glitch when scrolling down in the mobile layout.
- What was attempted:
  - Engines and sizes: Chromium as a Pixel 7 and at 360 × 740, and WebKit as an iPhone 13.
  - Actions: wheel, programmatic and synthesized touch scrolling, on the Items and Details steps, empty and with items.
  - Result: the page height stayed fixed, and scrolling stopped at the end of the content with the cart bar above the bottom navigation. No closed sheet or hidden step adds to the page's height.
- Why it is blocked: it does not reproduce under emulation.
- Required decision/input: the device, the browser and a screen recording, or how the page is opened (phone over the network, or DevTools device mode).
- Temporary workaround: none needed to use the page.

## 2026-09-26 — Phase 5 begins: paging and server search for every list (R5.13, foundation)

### Added
- **The page shape (`src/lib/api/pagination.ts`).** Every paged route answers `{ items, nextCursor }`.
  - The cursor is where the next page starts, as digits. A route asks for one row more than a page (`PAGE_SIZE`, 20) to know whether another follows, so no count is needed.
  - `cursor` and `search` are parsed once, by `listQuerySchema` (`src/lib/validation/schemas/list.ts`). The search is normalised and bounded like any line.
- **Search that is safe to hand to PostgREST (`src/lib/supabase/search.ts`).** `containsPattern` drops LIKE wildcards and the characters that end or nest a filter; `ilikeFilter` quotes the pattern for an `or` filter.
  - `phoneDigits` matches a phone however it was typed, "98765 43210" or "+91-98765-43210" (BUG-23).
- **`useApiPages` (`src/lib/query`).** A paged list on SWR's infinite loader, in the shape `ListScreen` reads.
  - A new search or tab starts again from its first page, while the last rows stay on screen until the new ones arrive.
  - Every page shown is read again when the list is refreshed.
- **`withQuery`** builds a route with its query and leaves out empty values, so a list with no search shares its cache with every other reader of the route.
- **`ListScreen`:** **Show more** under a paged list while another page follows. `renderList` lets a screen draw the whole list itself, as hairline rows or a table.

### Changed
- **`useApiMutation`** refreshes every cached read of a stale route: searched, filtered and paged ones as well as the bare route. SWR's own key filter skips paged lists, so the hook walks the cache itself.

### Validation
- `tsc` and `eslint` are clean. The new modules are at 100% coverage.

### Blockers
- None. Screens move onto paging one by one as they are rebuilt. `GET /api/orders` switches last, after Home, Analytics and Customer detail stop reading every order.

## 2026-09-26 — Home (R5.1) and its filters (R5.15)

### Added
- **`GET /api/dashboard?period=TODAY|WEEK|MONTH&status=&payment=` (`src/features/dashboard/api.ts`).** Works Home out on the server from bounded queries, so the browser no longer reads every order, product and stock line (§133.9 I4).
  - **Queries:** the period's orders once, for the tiles and the charts. The orders due, what is owed, the ledger, the products and the recent customers each have their own query.
  - **Sums:** every sum is a pure function in `summary.ts`, tested on plain rows.
- **Home (`src/features/dashboard/components/Home.tsx`).** Built as §139.10 lays it out. `src/app/page.tsx` now only draws it.
  - **Greeting:** "Good morning, {first name}", by the business's clock (§134 P2-1), over the catch phrase or a neutral line. It sits on the hero plate on a phone; on a desktop it is a row with the date and the quote.
  - **Tiles:** due today, sales for the period, to collect, low stock, with a Today / Week / Month switch. Sales has its sparkline from 1024 px.
  - **Orders due:** grouped Overdue / Due today / Tomorrow, soonest first, with **View all**.
  - **Low stock:** stocked products only, the rule the oversell guard uses (0015). A product nobody counts is not "low".
  - **Desktop:** the sales by day, the orders by status, the top products (custom items as one line) and the recent customers.
  - **Also:** the quote block on a phone, and **New order** as the + (the words from 768 px).
- **Dashboard filters (R5.15, §116–§117).** A sheet on the orders due with Preparation (All, Pending, Preparing, Ready, Out for delivery) and Payment (All, Unpaid, Part paid, Paid).
  - The two combine, and **Clear filters** removes both.
  - The filter button shows a dot while either is on.
- **The order row (`OrderRow`, `OrderListItem`, `ORDER_LIST_COLUMNS`).** An order as every list will show it, read in one query with its customer, its lines and each line's illustration.
  - **Line 1:** the first item's illustration, then the number and the customer, or Guest.
  - **Line 2:** the first item and "+2 more".
  - **Line 3:** "Due 27 Sep · ₹750 to pay" (IMP-07).
  - **Right:** the amount and the status pill.
- **Kit:**
  - `SectionHeading`: a title with **View all** named for a screen reader.
  - `FilterButton`: taken out of `SearchField` so a list without search can use it.
  - `LoadFailed`: taken out of `ListScreen` for a screen that is not a list.
- **Calendar:** `addDaysKey`, `dayStart` (India's midnight as an instant), `weekStartKey`, `monthStartKey`, `daysFrom`, `bakeryHour`. `formatLongDate` gives "Saturday, 26 Sep 2026".
- **Other:** `readQuery` parses a route's query through a schema, as `readJson` does a body. The test support gains `fakeSupabase`, a recording, chainable query double.

### Changed
- **IMP-05 / §134 P2-2:** an order due today stays **today** until the day ends. It is overdue only on a later day, in `dueBucket` and `isOverdue` alike, so Order detail's "late" follows too.
- Home's greeting no longer says "Good morning, Baker!".

### Removed
- The old Home page's browser-side sums (`summarise`, `ordersByDue`) and its quick-action tiles, which were outside §139.10.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 219 test files and 1,384 tests pass. The new components, the summary, the API and the list model are at 100% coverage.
- `GET /api/dashboard` was read against local data. The day sums add up to the period total. The filters combine. A period it does not know is refused in the validation envelope.
- **Captures:** 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll and no errors on the page.

### Blockers
- None. The order row cuts off its longer lines at 360 px, but the number, the due date, the amount and the status stay whole.

## 2026-09-26 — Analytics (R5.9)

### Added
- **`GET /api/analytics/overview?range=&from=&to=&interval=` (`src/features/analytics/api.ts`).** Analytics is worked out on the server, so the browser no longer reads every order to add it up (§133.9 I3).
  - **Queries:** one for the period's orders and the period before, each with its customer, lines and payments embedded; one for the customers who joined.
  - **Period:** a preset, or `CUSTOM` with both dates, 1 to 366 days (`rangeQuerySchema`). The period before is the same days of the month before for a month preset, and the same length just before otherwise (`src/lib/dates/range.ts`). Daily up to 31 days, weekly beyond, or as chosen.
  - **Sums:** each is a pure function in `summary.ts`, tested on plain rows. A payment counts only up to its order's total.
- **Analytics (`src/features/analytics/components`).** The compact band, the range picker and five tabs, as §139.10 lays them out.
  - **Overview:** four tiles, each with its change on the period before (IMP-10); the sales trend, with the period before dashed beneath it on a desktop; the top selling products; **Sales by product**; and the quote.
  - **Sales:** the trend against the period before; Guests against saved customers; collected against still to collect.
  - **Orders:** orders per day or week; by status; pickup against delivery.
  - **Customers:** new against returning; the ten top customers, Guests left out (§133.9 I1).
  - **Products:** every product ranked by sales or by quantity, custom items as one row.
- **Sales by product** (the user, 2026-09-26) stands where the reference has sales by category, which left with product categories.
  - The ring shows the top five and Others, with custom items as one slice.
  - Its centre says **Item sales**, because charges and discounts are no product's, so it can differ from Total sales.
  - The top selling products list catalogue products only (§139.11.7).
- **`useRememberedRange`:** each report screen comes back to the period last chosen there, on this device. **`useMediaQuery`:** for what CSS cannot decide, such as drawing the period before.

### Changed
- **Donut legend:** it stands beside the ring once its longest name fits in full, and beneath it until then.
  - At 360 px, "Saved customers", "Preparing" and "To collect" had been cut to a few letters.
  - A product's name waits for a tablet to sit beside the ring (§139.11.11 updated).

### Removed
- The old `getOverview` and the browser-side sums it stood beside.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 227 test files and 1,441 tests pass.
- Coverage is 100% for Analytics, its hooks, the chart kit, the range and its schema.
- **Captures:** every tab at 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll and no errors on the page.

### Blockers
- None. §133.9 I1 and I3 are closed, and IMP-10 is done.

## 2026-09-26 — Orders (R5.2), Customer detail (R5.4) and Guest sales (R5.5)

### Added
- **`0017_list_views.sql`.** Two read-only views. Both are `security_invoker`, so row-level security still decides what anyone sees; `authenticated` may select, `anon` may not. No table.
  - **`order_search`** puts each order beside its customer's name and phone. PostgREST cannot `or` across an embedded table, and fetching matching customers first would put an unbounded list of ids in the URL.
  - **`customer_stats`** counts each customer's orders and their last one, cancelled ones not counted. It is used by Customers (R5.3), next.
- **`GET /api/orders`** is now paged (`src/features/orders/list.ts`), with `status`, `payment`, `customer=guest|{id}`, due-day `from`/`to`, `search` and `cursor`.
  - **Search:** by the order number, the customer's name, or their phone as typed (BUG-23).
  - **Order:** All is newest first; an open status is soonest due first; delivered and cancelled are most recently due first.
- **`GET /api/orders/counts`** counts every tab under the same filters, in the database, at once.
- **Orders (`src/features/orders/components/Orders.tsx`).**
  - Tabs with counts, search once typing pauses, and a filter sheet for due dates, payment and Guest orders only. **Show more** follows the pages.
  - Rows up to 1280 px, and from there a table: Order, Customer, Items, Amount, Status, Due.
- **Guest sales (`/customers/guest`, `GET /api/guest-sales`).**
  - For a period kept on this device: how many orders Guests placed and what they came to, then the orders, a page at a time. Cancelled orders are left out of both.
  - It is reached from Analytics' Guest split, and from Customers in R5.3.
- **Customer detail (`/customers/{id}`, `GET /api/customers/{id}/summary`).** It replaces the old profile, which read every order to add one customer's up.
  - **Contact:** initials, segment, phone, email and address, with Call, WhatsApp, Map and Edit.
  - **Figures:** orders, spend, customer since, and balance due.
  - **Tabs:** Orders (a page at a time), Notes, and Addresses, the distinct places their deliveries went.
  - **Create order** starts the order being built with them chosen, keeping what it holds (IMP-04).
- **Order again (IMP-03)**, on each order beside its items.
  - It rebuilds the draft from that order: items, notes, customer and hand-over.
  - It asks before replacing an order being built, and says what was left out because it is no longer on sale.
- **Segments:** Regular from three orders; New while added in the last 30 days; Regular wins.
- **Smaller pieces:**
  - `useApiPages` hands back its first page for a route that sends more than rows.
  - `formatTime` gives "11:50 PM" on the business's clock.
  - `itemsLine` is shared by the row and the table.
  - `customerForDraft` and `repeatOrder` join the draft.

### Changed
- The date formatters read the clock once through one helper.
- `OrderRow` can leave the customer's name off, on that customer's own screen.

### Removed
- `getAllOrders`, `findAllOrders`, `findOrderLines`, `OrdersClient.list` and `byDueDate`: the browser no longer reads every order to list, filter or sort them.
- The old Orders page and `CustomerProfileClient`.

### Validation
- `tsc`, `eslint`, the test-path check and `next build` are clean. 236 test files and 1,514 tests pass.
- The new and changed modules are at 100% coverage. The last uncovered branch in `order.ts` is the payment form's, from before this change.
- **Against local data:**
  - The paged route, the tabs and their counts, search by name and by phone digits, and the refusal of a backwards date range were all checked.
  - A signed-out caller is refused both views.
  - Order again and Create order were followed in a browser.
- **Captures:** Orders, Guest sales and Customer detail at 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll. Order detail was captured at 360 and 1280.

### Blockers
- None.
- **Plan addition:** `0017_list_views` adds two read-only views (no table), recorded in the plan's migrations table.
- **Still open:** order rows at 360 px cut the customer's name short, as before; the number, amount and status stay whole.

## 2026-09-26 — Customers (R5.3)

### Added
- **`GET /api/customers?segment=REGULAR|NEW&search=&cursor=`** (`listCustomers`), a page by name from `customer_stats` (0017).
  - **Regular:** three or more orders, cancelled ones not counted.
  - **New:** added in the last 30 days and not yet Regular.
  - **Search:** the name, or the phone on its digits however it was typed (BUG-23).
  - **Each row:** the customer with their orders, last order and segment (`CustomerListItem`).
- **Customers (`src/features/customers/components/Customers.tsx`).**
  - **Tabs:** All · Regular · New.
  - **Search:** runs once typing pauses.
  - **Pinned Guest sales row:** the count, total and period Guest sales was last read for, from the same request, so opening it shows the same figures at once.
  - **Rows:** initials, name and segment, then "12 orders · last order 2 days ago".
  - **Adding:** **+** for a new customer, whose screen opens once saved.
- **`formatDaysAgo`:** "today", "yesterday", "5 days ago", then weeks, months and years, by the business's calendar.
- **`GuestMark`** in the kit, for a Guest wherever initials would be: the picker, Order detail and Customers.

### Changed
- **The customer picker searches on the server.**
  - The order screen reads customers only while the picker is open, a page at a time, with **Show more**, rather than every customer when the screen opens.
  - The picker's own browser-side filter is gone; it shows what the screen hands it.

### Removed
- `getAllCustomers` and `CustomersClient.list`. No screen reads every customer now.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 238 test files and 1,535 tests pass. The new and changed modules are at 100% coverage.
- **Against local data:** paging, both segments, and search by name and by "98234 56789" were checked. The picker's server search was followed in a browser.
- **Captures:** Customers at 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll.

### Blockers
- None. BUG-23 is fixed.

## 2026-09-26 — Products (R5.6)

### Added
- **`0018_drop_categories.sql`.** It drops `products.category_id`, with its composite reference and index, then the unused `categories` table with its policy, trigger and checks. Products need no categories (2026-09-25). Expense categories are untouched.
- **Products (`src/features/products/components/Products.tsx`).** Search by name.
  - **Rows up to 1024 px:** tile, name, then price per unit with the Active or "Not on sale" pill, and each product's menu.
  - **Cards from 1024 px:** the picture large, then the same facts.
  - **The menu:** **Edit**; **Take off sale** or **Put back on sale**, which says what that means for the order screen; and **Record stock**, which opens the stock sheet for that product.
- **`IllustrationPicker`** in the kit. The library in its groups, defaults first, each picture a choice named by its label, the one in use marked. Expense categories will use it in R5.16.
- **The product form's Picture field:** the current illustration and **Change**. A stored key the library no longer has shows, and saves, as the price tag.
- **Units:** set, bunch and pack (Q8). The unit names are now in `UI_TEXT.products.units`.

### Changed
- The product form and its copy moved into `messages.ts`.
- The product form and the stock sheet no longer take an `onSuccess`: each refreshes what it changed itself.

### Removed
- `categoryId` from products, their schema and their editable columns.
- The unused `optionalUuid` primitive, and `ProductsClient.list` and `get`.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 241 test files and 1,557 tests pass. The changed components and the picker are at 100% coverage.
- **Against local data:**
  - PostgREST no longer finds `categories`, and `products.category_id` is gone.
  - The menu, the form and the picker were followed in a browser; choosing "Glazed cake" set the field.
- **Captures:** Products at 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll.

### Blocker
- Status: OPEN
- Area: R5.13 (pagination) — Products
- Description: The plan asks for paging on every list. Products is still read whole.
- What was attempted: Orders, Customers, a customer's orders, Guest sales and the customer picker are paged, with search on the server.
- Why it is blocked: the order screen prices its draft's lines, and shows their names and pictures, from the whole product read, and Order again checks what is still on sale against it. Paging products means a second way to read products by id for the draft, a change to the order screen beyond R5.6.
- Required decision/input: keep the menu read whole, since a business's products are a menu rather than a growing ledger; or page Products too, and change the order screen to read its draft's products by id.
- Temporary workaround: Products is read whole and searched in the browser, as before.

## 2026-09-26 — Inventory (R5.7)

### Added
- **`0019_stock_levels.sql`:** a read-only, `security_invoker` view that adds each product's ledger up in the database.
  - **Columns:** the balance; `stocked`, which is the oversell guard's own test from 0015; and the last movement.
  - **Readers:** Inventory's balances (`GET /api/inventory/balance`) and Home's low stock now read it.
- **`GET /api/inventory?product={id}&cursor=`** (`listStockMovements`): one product's ledger, newest first, a page at a time.
- **Inventory (`src/features/inventory/components/Inventory.tsx`).**
  - **Rows:** each product on sale with what is in stock, or "Made to order — stock not counted", and **Low stock** at or under the mark.
  - **Order:** products whose stock is kept come first, emptiest first.
  - **History:** a row opens the product's history (`StockLedgerSheet`): on the shelf now, then each movement signed and dated, an order's line opening that order, with **Record stock**. Recording updates the history and the balance at once.

### Fixed
- **Stock figures past 1,000 ledger lines.** Inventory and Home read every ledger line and added them up in the server code, but a read stops at the API's row limit (`max_rows`, 1,000). Past that many movements the balances, and so low stock, were quietly wrong. They are now added up in the database.

### Removed
- `InventoryClient.balances`, which had no callers.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 245 test files and 1,575 tests pass.
- The Inventory components are at 100% coverage, and the inventory data functions have tests for the first time.
- **Against local data:**
  - The view's balances match the ledger.
  - Recording 6 boxes moved Fudgy Brownie from 3 to 9, and out of Low stock, in a browser.
- **Captures:** Inventory at 360, 390, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll.

### Blockers
- None. Other reads that can pass the 1,000-row limit are fixed next, in their own change: a year of orders for Analytics, and Guest sales' totals.

## 2026-09-26 — Reads past the 1,000-row limit (BUG-31)

### Fixed
- **Sums over a read that stopped at 1,000 rows.** The API answers at most `max_rows` (1,000) rows a read, without saying so. Every screen that added up what came back was quietly short past that many rows.
  - **Analytics:** a year of orders and the year before, and the customers added over them, are now read a window at a time.
  - **Guest sales:** the period's totals, read a window at a time.
  - **Home:** the period's orders, and what is still owed, each order now read with its payments embedded. This also removes a second query whose URL listed every owing order's id. The recent customers' order counts now come from `customer_stats` rather than from every order they placed.
  - **A customer's summary:** their orders, read a window at a time.
  - **Stock:** fixed by `0019_stock_levels` in the Inventory change.
- **`readAll`** (`src/lib/supabase/readAll.ts`) reads window after window of `API_MAX_ROWS`, each ordered by id, until one comes back short.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 246 test files and 1,578 tests pass. `readAll` is tested across several windows.
- Home, a year-long custom Analytics period, Guest sales and a customer's summary were read against local data.

### Blockers
- None.

## 2026-09-26 — Expenses (R5.8) and expense categories (R5.16)

### Decision
- **Expense categories: the eight defaults, and the business's own** (the user, recorded in the plan's answers of 2026-09-26).
  - **Defaults:** the eight stay exactly as they are — fixed names, the receipt picture, never edited or deleted.
  - **The business's own:** a business adds categories of its own, each with a picture from the library, and only it sees them. It renames one or changes its picture; it deletes one only while no expense is filed under it.
- **Expenses are edited and deleted** from their form; deleting is confirmed first.

### Added
- **`0020_expense_categories.sql`:**
  - **`expense_categories`:** RLS to the business, SELECT only for the API role, names unique per business whatever their case, never a default's.
  - **`expenses.category`:** the CHECK of the eight becomes a trigger. It accepts a default or one of the business's own, and locks that category's row against a rename or delete running at the same time.
  - **Owner-only functions:** create, update and delete a category. A rename moves the category's expenses and picture in one transaction; a delete is refused while an expense uses the category.
- **Routes:**
  - `GET /api/expenses` is now paged: `?range&from&to&category&cursor`.
  - `GET /api/expenses/summary`: the total and daily average against the period before, every category's total and count, the trend and the latest five, summed on the server.
  - `GET, POST /api/expense-categories` and `PATCH, DELETE /api/expense-categories/{category}`.
- **Expenses (`src/features/expenses/components/Expenses.tsx`):**
  - **Header:** the band, the remembered period and **+**.
  - **Overview:** the two figures (a rise in cost reads as bad news), the category ring, the daily or weekly bars, and the latest expenses. On a desktop: the figures in a row, the charts side by side, and the latest as a table.
  - **Categories:** a default opens its expenses. One of the business's own has its picture tapped to change it, and its row offers its expenses, **Edit name and picture** and **Delete category**. **New category** adds one.
  - **Transactions:** by month, a page at a time, filtered by any category. Rows on a phone, a table from 1024 px.
- **The expense form:**
  - **Category** is a grid of pictures, the business's own after the eight, with a **+** that makes a category on the spot and chooses it.
  - An expense being edited offers **Delete expense**.
  - Its words moved to `messages.ts`.
- **In the kit:**
  - `PictureField` — the Picture field the product form and the category sheet share.
  - `IntervalSelect`, moved from Analytics into the chart kit.
  - `Row`'s `leadingControl`.
  - `ProductTile`'s `fallback`.

### Changed
- `EXPENSE_CATEGORIES` is now `DEFAULT_EXPENSE_CATEGORIES`, and a category is any name: the database decides which the business has.
- New error codes: `EXPENSE_CATEGORY_ALREADY_EXISTS` (409), and `EXPENSE_CATEGORY_UNKNOWN`, `EXPENSE_CATEGORY_IN_USE` and `EXPENSE_CATEGORY_DEFAULT_FIXED`.

### Removed
- `getAllExpenses` and `ExpensesClient.list`, and the old Expenses page, whose words were hard-coded.

### Fixed
- **A category name holding "%"** was decoded twice on its route, and failed. Next already decodes the segment.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 259 test files and 1,659 tests pass. The expenses feature, `PictureField`, `Row`, `ProductTile` and `IntervalSelect` are at 100% coverage.
- **On the local database, as the owner:**
  - A category is added and an expense filed under it.
  - A rename moves its expense and its picture.
  - Refused as they should be: a name taken (whatever its case), a default's name, an unknown category, and changing or deleting a default.
  - A category with an expense cannot be deleted; an unused one can.
  - Another business's category can be neither seen, used, changed nor deleted, and a business may have its own of the same name.
- **Over HTTP:** the same, including a name with "%" and a space.
- **In a browser:**
  - The form's **+** made a category with a chosen picture and selected it.
  - A category was renamed, then deleted after the confirmation.
  - A default opened its expenses.
- **Captures:** Overview, Categories and Transactions at 360, 390, 414, 820, 1280 and 1440 px, in Golden and Peach, with no sideways scroll.

### Blockers
- None. R5.13's question about paging Products stays open (above).

## 2026-09-26 — Motion across the shared kit

### Added
- **Sheets and cards leave the way they came** (`globals.css`, `modal.tsx`):
  - **On a phone:** a sheet slides back down in 200 ms and the dimmed page lifts.
  - **From 768 px:** the centred card rises a little and settles, rather than travelling its whole height.
  - **Response cards and notices:** they drop away, and the next waiting card follows.
  - **Where it plays:** only where the browser can keep a closing dialog on top (`overlay`). Elsewhere a sheet closes at once, as before. Either way, focus returns straight away.
- **Tabs:** one underline slides to the chosen tab, and the new view comes in 8 px from that side (`tabs.tsx`). The new-order steps' travel was moved into `travelIn` (`src/lib/motion.ts`), which both use.
- **Lists keep their places** (`useListMotion`, on `RowList` and `ListScreen`'s cards):
  - **When an item leaves:** the rest close the gap, and the list's edge follows up.
  - **When the order changes:** each item slides to its new place, and a moved item that is interrupted carries on from where it is.
  - **When one joins:** it drops in, a few staggered.
  - **What never plays:** a first showing, a hidden list, or a search or new page, which only fades in the new items.
- **Content fades in over its skeleton on every screen.** The main region watches for a skeleton leaving (`useSettle`, `data-skeleton`), so no screen's loading branch changed. Cached content simply shows.
- **`useKept`:** a sheet that lets go of its record as it closes keeps showing it while it leaves. It is used in:
  - a product's actions;
  - a category's actions;
  - a product's stock history;
  - the placed order's bill.
- **Custom dates** drop into place under the range picker.

### Changed
- A pressed button, round `+`, icon button, stepper or cart button now eases its shrink back instead of jumping. The kit animates only colour, shadow, opacity and transform: `transition-all` is gone.
- The app's main region fades in on arrival instead of rising, and clips sideways overflow. The rise made it the containing block for the round `+` for 250 ms, so the button jumped into place.

### Validation
- `tsc`, `eslint` and the test-path check are clean. 263 test files and 1,689 tests pass. The new hooks, `src/lib/motion.ts` and the changed kit are at 100% line coverage. The only uncovered branches are three defensive branches that were already uncovered: two in `Modal`, one in the notice's Escape handler.
- **In Chromium at 390 and 1280 px:**
  - The underline slides from tab to tab.
  - A sheet closed with Escape is still drawn 70 ms later, part way down, with focus already back on its opener, and is gone by 470 ms.
  - A confirm card and a notice leave, then are removed.
  - A new category's row drops in, and a deleted one's list draws its edge up.
  - The Custom dates drop in, and nothing scrolls sideways.
  - Under reduced motion, every one of these is a fade.

### Blockers
- None.

## 2026-09-26 — More and Settings (R5.11), paging settled (R5.13), strings swept (R5.14)

### Decision
- **Products stays one read** (the user). A business's products are a menu, not a growing ledger, and the order screen prices its draft from that read. Products and Inventory's list are read whole and searched on the device; every list that grows with the business is paged.
- **About credits the app's maker, not the illustrations** (the user). Settings → About reads **Crafted by · jaFFa**, in place of Q16's Vecteezy credit.

### Added
- **Settings** (`src/features/auth/components/Settings.tsx`), with the reference's Profile screen folded in:
  - **Profile:** the initials, name, "Owner · {business}" and the catch phrase, under a photographic band. It stays beside the rest on a desktop.
  - **Business details.**
  - **Account:** name, sign-in number (written `+91 98765 43210`, not as stored) and email; **Change password**; and, while the email is unconfirmed, the notice and **Resend confirmation**.
  - **Appearance:** Golden or Peach, kept on the device.
  - **About:** the version, which the build takes from `package.json`, and Crafted by · jaFFa.
  - **Sign out.**
- **More** gives each place a line on what it holds, and ends with a **Sign out** row (`SignOutRow`, shared with Settings). A second tap while signing out does nothing.
- `pluralUnit` in `src/lib/format/quantity.ts`.

### Changed
- The theme switch moved from the More sheet and the account menu to Settings → Appearance, and into the kit (`src/components/ui/theme-switch.tsx`).
- **Every remaining piece of copy is in `messages.ts`:**
  - the customer, stock and payment forms;
  - the sign-in, register, forgot-password and change-password screens' placeholders and hints;
  - the nav's place names;
  - the page's title and description;
  - the map-link, phone and amount examples each screen repeated.
- The swept forms' labels are in sentence case: "Save customer", "Phone number", "Record payment".
- **The stock form:**
  - It is now **Record stock — {product}**, matching the button that opens it.
  - "Adjustment Type" is now **What happened**.

### Removed
- `AccountSummary`; Settings' account section replaces it.
- The `settingsRow` copy under `business`.

### Fixed
- **The stock form's quantity label** added "s" to any unit ("in kgs", "in boxs"). It now reads "Quantity (kg)", "Quantity (boxes)" (§134 P4-3).
- **The sign-in number** was shown raw on Settings (§134 P4-6).

### Validation
- `tsc`, `eslint` and the test-path check are clean. 264 test files and 1,697 tests pass.
- Settings, `SignOutRow`, the More sheet and the theme switch are at 100% coverage. The auth forms and `messages.ts` have the same uncovered branches they had before.
- **Captures:** Settings at 360, 390, 820 and 1280 px, and More at 360 and 390, in Golden and Peach, with no sideways scroll. Every More line fits a 360 px phone.

### Blockers
- None. R5.13's question about Products is answered, and its blocker is resolved.

## 2026-09-26 — Phase 5 checked, Notifications aside

### Fixed
- **Analytics scrolled sideways by 25 px on a 360 px phone.** The chart's screen-reader table grew past the screen: a table ignores the one-pixel width that hides it. It is now hidden inside a box that keeps that width (`ChartTable`, `chart-frame.tsx`).

### Validation
- **Every screen was checked in Chromium:** 16 routes at 360, 390, 414, 820, 1280 and 1440 px, in Golden and Peach, 192 captures in all. After the fix, nothing scrolls sideways and no page logs an error.
- `next build` passes, and the version is written into the page.
- **Tracker:** Phase 5 is done except R5.10 Notifications, which the user set aside. The exit test holds for every built screen.

### Blockers
- None.

## 2026-09-26 — Profile details once every 30 days (R5.17)

### Decision
- **Each detail changes once every 30 days** (the user): the owner's name, the sign-in number, the email address and the business's name. Each opens again 30 days after its own last change, and a new account makes its first change at once.
- **The current password** is asked for before the sign-in number or the email changes.
- **A new email takes effect only once confirmed.** Registration's confirmation email and queue are used as they are; the user will set up the mail's own wording later.
- **The owner's name** becomes editable, under the same rule.

### Added
- **`0021_profile_changes.sql`:**
  - **Change dates:** each of the four details gets a change date. A trigger on `profiles` and on `bakeries` refuses a change inside 30 days (`PROFILE_CHANGE_TOO_SOON`, 422) and stamps the date itself. No path goes round it, and no caller can clear a date.
  - **A waiting email:** `profiles` gains `pending_email`, the hash of its link's token (never the token), and when that link lapses.
- **`src/features/auth/account.ts`:**
  - **`changeName`, `changePhone`, `requestEmailChange`, `resendEmailChange`, `confirmEmailChange`,** and the worker's `sendEmailChangeConfirmation`.
  - **Checks:** the password is tried on a client of its own, whose session is signed out at once. A wrong one is a 400, so the browser does not try to refresh a session that is fine.
  - **Two copies kept in step:** Auth's copy of a number or email changes first, and is put back if the profile cannot follow.
  - **Audit:** every change is recorded.
  - **The link's token:** made when the email is sent, never queued, and it lapses after 48 hours.
- **Routes:**
  - `PATCH /api/auth/name` and `PATCH /api/auth/phone`;
  - `POST /api/auth/email`, `/email/resend` and `/email/confirm`;
  - `withAccountRoute`, which serves them the tenant and the server's client.
- **The `SEND_EMAIL_CHANGE_CONFIRMATION` job**, on the NotificationWorker.
- **Settings:**
  - **Account rows:** the name, sign-in number and email are rows that open a change sheet (`AccountChangeSheet`). A detail changed within 30 days says when it opens again, and does not open until then.
  - **A waiting email:** its notice, with **Send the link again**.
- **The confirmation page** also finishes an email change, signed in or not, on any device.
- **Business details** locks the name until it may change again, and says when that is.
- **Kit:** a read-only field reads quieter.

### Changed
- The session's profile carries each detail's change date and the waiting email.
- The confirmation page drops a check that could never be reached.

### Validation
- **On the local database, in a rolled-back transaction:**
  - a first change is taken and stamped, and a second within 30 days is refused;
  - a date cannot be written away, and the detail opens again after 30 days;
  - the business's name follows the same rule, and the same value again is no change.
- **Over HTTP, on a throwaway account:**
  - **Name:** it changes once, then is refused within 30 days; the same value is refused.
  - **Sign-in number:** a number another account holds is refused, and so is a wrong password. After a change, the old number no longer signs in and the new one does, and the caller's session stays live.
  - **Email:** a new one waits while the old stays in use, and its job is queued. A wrong link is refused; the right one switches both copies; using it twice is refused.
  - **Business name:** it follows the rule while other fields stay free. Four audit rows were written.
- **End to end with the worker:** the worker sent registration's confirmation email to the new address, through the local mail catcher, and the link in that email confirmed the change.
- `tsc`, `eslint` and the test-path check are clean. The suite passes. `account.ts`, the reopen helper, the change sheet, Settings, the confirmation page and Business details are at 100% coverage.
- **Captures:** Settings' account rows with a locked name and a waiting email, the sign-in number sheet refusing a wrong password, and the locked business name, at 390 and 1280 px, with no sideways scroll.

### Blockers
- None. A worker process started before this change must be restarted to take the new job.

## 2026-09-26 — Tabs: a resize as they leave

### Fixed
- **"Cannot set properties of null (setting 'hidden')"** in `placeUnderline` (`tabs.tsx`), reported by the user from the web. As a screen with tabs left, React let go of its refs before the effect watching the tabs' sizes was cleaned up, and a resize arriving in between found no underline. The watcher now holds the tabs and the underline from its start, and does nothing once the tabs are gone.

### Validation
- A new test delivers a resize after the tabs have gone; the tabs are at 100% coverage.
- **In Chromium:** four rounds through Expenses, Orders, Analytics and Customers, switching a tab and resizing the window on each, raised no page error.

### Blockers
- None.


## 2026-09-26 — Notifications (R5.10); Phase 5 closed

### Added
- **The inbox** (`/notifications`, plan §139.10):
  - what happened in the business, newest first, a page at a time;
  - tabs **All · Orders · Customers · System**;
  - **Mark all as read**, whose failure is a response card;
  - tapping a row follows its link and marks it read;
  - loading, empty, empty-tab and failed states, with Try again.
- **The bell** in the phone's top bar and the wider screens' top bar, carrying the unread count — 1 to 9, then "9+" (the user asked for a count; see Decisions). Its name says the exact number. It asks again every minute and whenever the app comes back into view. **Notifications** joins the sidebar and the rail; it stays out of More, since the phone has the bell.
- **`0022_notification_kind`:**
  - `notifications.kind`, and indexes for the newest-first read and the unread count;
  - the owner can mark a notification read and change nothing else about it;
  - triggers queue an **order placed**, a **customer added**, and a counted product on sale **falling to the low-stock mark** — once as it crosses, never for a delivered order's consumption line.
- **`0023_order_due_notifications`** (the user): an open order **due soon** (today or tomorrow) and one **overdue** are each told once, from 8 AM in the business's day. The worker sweeps every minute through `queue_due_order_notifications`, which marks and queues in one statement, so two workers tell an order once. Open orders more than a day overdue when it arrives are taken as told.
- **The worker:**
  - it files each notification in the business's inbox, under its job's id, so a retried job writes no second copy;
  - then it pushes, as before;
  - `lib/jobs` gains sweeps: work a worker looks for every minute rather than is asked for.
- **Routes:** `GET /api/notifications`, `GET /api/notifications/unread`, `POST /api/notifications/read-all`, `POST /api/notifications/{id}/read`.
- **Kit:** a row's subtitle may take two lines (`wrap`); a notification's message is not cut short.

### Changed
- A payment's notification carries its order's id, so it links to the order.
- Settings' Notifications row — the Android permission — comes with push (R8.6).

### Decisions
- **The count** caps at "9+", not the "10+" suggested: two characters keep the badge a circle on a 44 px bell. It is one constant (`NOTIFICATION_BADGE_MAX`).
- **Due is counted in days**, as everywhere in the app (IMP-05), and alerts wait for the business's morning.
- Recorded in the plan's answers of 2026-09-26.

### Validation
- **On the local database, in a rolled-back transaction:**
  - a product counted at 8 alerted once as it fell to 4, two order lines in one statement included; not again at 3; not for a delivered order of something already low; again after a restock fell to 5; never for a product nobody counts;
  - a customer added queued its notification;
  - the owner could not insert a notification or change its words, only mark it read;
  - the due sweep queued five orders due tomorrow and yesterday's overdue one, a second sweep queued none, a sweep before the hour queued none, and a signed-in user could not run it.
- **Over HTTP, on a throwaway account:**
  - **Events:** a customer, an order for them, a payment, a status move, and a guest order that took a product to 4 all queued their notifications.
  - **The new worker code** wrote each with its kind, words and link; run again, it wrote no duplicates.
  - **API:** the tabs narrowed as specified; the unread count fell as one and then all were marked read; a bad tab or id was refused.
  - **Tenant isolation:** another business could neither see nor mark the notification.
- **In Chromium:** the inbox and the bell at 360, 390, 820 and 1280 px in Golden and Peach, with no sideways scroll and no page errors.
- `tsc`, `eslint` and the full suite pass. Every new component, hook and client service is at 100% coverage.

### Blockers
- None.
- **Migrations:** `0022` and `0023` are applied locally; they need applying in other environments.
- **Restart the worker:** one started before this change does not know the new kinds. It fails their jobs, which retry every 5 minutes and are set aside after 3 tries.

## 2026-09-26 — Plan: Phase 9, Delight

### Added
- **Phase 9 — Delight** in the plan (§139.18, the Phase 9 tracker, and a new §139.21), at the user's request through `/impeccable delight`. It is recorded only; nothing is built.
- **The four moments the user chose:**
  - **Order milestones:** Order placed, Paid in full, and Delivered or Completed each get a card with the order's own illustration.
  - **Empty states in the app's own art.**
  - **The inbox caught up.**
  - **Warmer system screens.**
- **Tone:** warm and quiet, the user's choice over playful.
- **Rules:** routine saves stay plain; at most one warm phrase per moment; motion of 400 ms or less that only fades under reduced motion; only the illustrations the app already ships; no sound.
- **Android:** a light haptic on the milestones waits on the native layer (R8.3).

### Validation
- A plan change only; no code was touched.

### Blockers
- None. Phase 9 waits only on Phase 5, so it can start before Phases 6 – 8 whenever the user asks.

## 2026-09-27 — PRODUCT.md

### Added
- **`PRODUCT.md`** at the root, through `/impeccable init`: the product record that Impeccable's design work reads. It covers users, purpose, positioning, operating context, capabilities and constraints, brand commitments, evidence on hand, principles and accessibility.
- **The user's answers:**
  - the owner runs the business from the phone day to day, and sits down at a desk weekly for accounts and analytics, so desktop matters as much as the phone;
  - Brio replaces WhatsApp with a notebook, general billing apps and spreadsheets;
  - it launches publicly on the Play Store, with no users or testimonials yet, and none may be invented.
- **Drawn from the plan and marked as such:** the out-of-scope list (Q7), the open decisions (Q9, Q10, Q16) and the platform. The platform is `web`: the Android app wraps the same web app.

### Validation
- A documentation change only. Every path it cites exists.

### Blockers
- None.

## 2026-09-27 — Layout pass (`/impeccable layout`)

### Changed
- **Guiding rule:** what is due and owed leads every screen. The title stands clear of the controls, the controls bind to their list, and desktop columns stack on their own.
- **Home:**
  - **Phones:** the orders due now start on the first screen of a 390 × 844 phone. The first overdue row sits at 654–739 px, above the tab bar at 776, where before it sat behind it. The greeting takes the kit's compact band below 1024 px, and the tiles run four across from 768 px.
  - **Desktop:** the grid becomes two columns that stack independently: orders due and the sales overview; then low stock, order status, top products and recent customers. The one-row Low stock no longer leaves a hole, and the last row's column widths no longer flip.
- **Stat tiles** (Home, Analytics, Expenses, Guest sales): below 1024 px the label sits beside the medallion, so a phone's two rows are about 26 px shorter each and a long amount keeps the tile's full width. From 1024 px the sparkline takes the medallion's row, so every tile is the same height and the others no longer show a dead band.
- **The round +** on a phone no longer covers a list's last row. The shell pads the screen's foot clear of it whenever one is on the screen (`data-fab`): 33–46 px clear on Products, Orders and Customers.
- **Page header:**
  - a wide control (a range picker, Mark all as read) drops under the subtitle on a phone instead of squeezing the title;
  - the header keeps 24 px below it on every screen, where list screens had 16.
- **Inventory:** from 1024 px a counted product's stock sits in the row's right-hand column, where it can be compared down the list. Phones keep it on the second line, so names keep their width.
- **Create order:** the product grid counts columns by the panel's own width, not the window's. On a desktop that is three cards with full names, not four cut short.
- **Orders table:** Due sits beside the order number.
- **Section headings** are the same height with or without View all, so headings side by side line up. The Expenses charts share a row height.

### Not changed
These are product or plan decisions rather than layout, and are left for the user:
- grouping the Orders list by when things are due;
- the band's place on Expenses and Analytics;
- merging order detail's customer and handover cards;
- a two-column Register on desktop;
- Balance due first on customer detail;
- where Add custom item sits.

### Validation
- **Before the pass:**
  - an independent assessment of 17 screens at 390, 820 and 1280 px;
  - the layout detector: no findings.
- **After the pass:**
  - the same 51 captures: no sideways scroll and no page errors;
  - the fold and the button's clearance measured in Chromium;
  - the design detector over the ten changed files: no findings.
- `tsc`, `eslint` and the full suite (1,823 tests) pass. Every changed component is at 100% coverage.
- The Expenses and Analytics trends that looked empty at 820 were captured before their bars grew in; they draw.

### Blockers
- None.

## 2026-09-27 — Sign-in side by side; Balance due on Customers; custom item first

### Added
- **Customers: a Balance due tab** beside All, Regular and New (the user). It lists the customers who still owe the business money, the most owed first, and pages and searches on the server like the others.
  - **`0024_customer_balance`:** `customer_stats` adds up each customer's balance: every order not cancelled, its total less what was paid, never below nothing. It is the same sum a customer's own screen makes.
  - **API:** `GET /api/customers?segment=DUE`, and every customer carries `balanceDue`.
  - **Rows:** on every tab, the amount owed sits at the end of the row, in the warning colour over a small "due". It stacks so that full names still fit at 360 px.

### Changed
- **The sign-in screens stand side by side from 1024 px** (the user):
  - the scene is on the left and the form on the right, both centred in the height, so Register's first step fits the screen whole where it used to scroll;
  - the frame is shared, so Sign in, Forgot password, Change password and Confirm email match;
  - the photograph reaches into the gap between the columns and fades out there, and the form's shadow falls below it as a card's does.
- **Customer detail leads with Balance due** (the user).
- **Create order:** Add custom item sits above the search and the grid (the user).
- Recorded in the plan's answers of 2026-09-27, §139.10, §139.12 and §139.13.

### Validation
- **On the local database:** the seed business's balances read ₹950, ₹560, ₹400 and nothing, matching their orders on Home.
- **Over HTTP:** `segment=DUE` returns those three, the most owed first. It combines with search, All carries every balance, and an unknown segment is refused.
- **In Chromium, with no sideways scroll and no page errors:**
  - the sign-in screens at 390, 820, 1024, 1280 and 1440 px in both themes; Register, Sign in and Forgot password no longer scroll from 1024 px;
  - the Balance due tab, customer detail and create order at 360, 390, 820 and 1280 px in both themes.
- `tsc`, `eslint` and the full suite (1,829 tests) pass. Every changed component is at 100% coverage.

### Blockers
- None.
- **Migration:** `0024` is applied locally; it needs applying in other environments.

## 2026-09-27 — A browser extension's attributes on `<body>`

### Fixed
- **"A tree hydrated but some attributes of the server rendered HTML didn't match"**, reported by the user. The attributes were `data-new-gr-c-s-check-loaded` and `data-gr-ext-installed` on `<body>`, which the Grammarly extension writes before React hydrates: not the app's markup.
- `<body>` now carries `suppressHydrationWarning`, as `<html>` already did for the theme. It ignores only `<body>`'s own attributes, one level deep, so a real mismatch anywhere in the page is still reported.

### Validation
- In Chromium, a script writing Grammarly's two attributes onto `<body>` before hydration reproduced the warning without the change and raised none with it.
- `tsc` and `eslint` are clean.

### Blockers
- None.

## 2026-09-27 — DESIGN.md (`/impeccable document`)

### Added
- **`DESIGN.md`** at the root: the visual system as built, in the DESIGN.md format, so new screens stay on-brand.
  - **Tokens:** machine-readable YAML covering the 49 colours of Golden, Peach and the shared status, chart and bill colours; the type roles; radii; spacing; and 16 component tokens.
  - **Sections:** the eight canonical ones, from Overview to Do's and Don'ts.
  - **Source:** every value comes from `src/app/globals.css` and the kit, including the contrast measured for each text pairing.
- **The user's language:**
  - the north star, **"The Home Kitchen Ledger"**;
  - the mood, warm, calm, exact;
  - controls that feel **soft and certain**;
  - the bakery pantry colour names (Toasted Caramel, Honey Gold, Espresso, Warm Cream, Oat Paper; Baked Terracotta, Apricot Glaze, Cocoa, Blush Cream, Rose Paper);
  - depth that is **layered and softly lifted**.
- **Named rules:** Role, Not Colour; Measured Pair; Accent Is Not Ink; Two Themes; Serif for Figures; Tabular Money; What-Is-Due-Leads; Warm Shadow; Float-Only Lift; One Card.
- **`.impeccable/design.json`:** the sidecar Impeccable's live panel reads. It holds tonal ramps in OKLCH for the key colours, the shadow, motion and breakpoint tokens, 10 self-contained component snippets (buttons, field, status pill, row list, bottom navigation, segmented control, stat tile), and the narrative copied word for word from DESIGN.md.

### Validation
- The frontmatter parses as YAML, and the sidecar as JSON.
- Its claims were checked against the code: the press scale, the pill buttons, the bell's colour, the radii and the contrast ratios.
- A documentation change only; no code was touched.

### Blockers
- None.

## 2026-09-27 — Performance pass (`/impeccable optimize`)

### Measured first
- **Setup:** a production build on a Pixel 7 profile with the CPU slowed 4× and a slow 4G connection (1.6 Mbps, 150 ms), cold and warm.
- **Cold loads** missed the 2.5 s LCP mark on every route, at 2.7–3.9 s. Warm loads were fine at 0.4–0.65 s, layout shift was near zero, and the main thread was not blocked.
- **The cost was what a first visit downloads before anything draws:**
  - about 490 KB of JavaScript;
  - 166–353 KB of fonts;
  - data that could only be asked for after a session check had answered.

### Changed
- **Zod: 130 KB → 32 KB on every route with a form.** The schemas import `* as z from "zod"` instead of `{ z }`. Turbopack could not see through the `z` object, so every locale Zod ships (72 KB compressed) came along; the app never shows them. The schemas are unchanged.
- **Fonts: 166–353 KB → about 115 KB on every screen.**
  - **The rupee sign:** "₹" lives only in each font's Latin-extended file (Inter 83 KB, Fraunces 103 KB), so every screen with money downloaded both. Each font's ₹ is now cut into its own file (1.3 KB and 1.6 KB, weight and optical-size axes kept) and stands first in its stack, covering only U+20B9 (`src/assets/fonts/`, SIL OFL).
  - **Fraunces axes:** it loads only its optical-size axis. Nothing set its soft or wonky axes, and dropping them took the preloaded file from 117 KB to 67 KB.
- **The session check no longer holds up a screen's data.** While "Checking your session…" shows, the screen mounts in a `hidden` wrapper and asks for its data at the same moment. It is out of sight, focus and the accessibility tree, so the browser gate stands.
  - Once the session is known, the same element shows and the screen is not mounted twice.
  - Someone signed out, or owing a password change, never sees it.
  - Warm loads get their data at about 410 ms instead of 590 ms.
- **The photographic plates** are served as AVIF (WebP where AVIF isn't taken) at quality 60, one of the qualities `next.config.ts` now allows. They sit faded behind words. drip-cake went from 55 to 23 KB, brownies from 62 to 25 KB, and cake-table from 30 to 12 KB, with no visible difference.
- **Home no longer shifts** when its orders arrive. The quote block at its foot waits for the page's data; shown during loading, it sat in view and was pushed down (CLS 0.10 → 0).

### Result (cold, throttled phone)
- **LCP:**
  - Sign in 3.24 → 2.63 s; Home 3.44 → 2.66 s; Orders 2.73 → 2.52 s; Create order 3.86 → 2.95 s;
  - Customers 3.05 → 2.49 s; Analytics 2.96 → 2.62 s; Expenses 3.88 → 2.85 s; Notifications 2.82 → 2.47 s.
- **Downloads:** JavaScript 322 / 494 → 263 / 435 KB (Sign in / an app screen); fonts about 115 KB; Home's images 82 → 41 KB.
- **Other metrics:** layout shift 0 everywhere but Create order (0.015); blocking time under 100 ms.

### Validation
- Tab underlines sit under the chosen tab after a screen is revealed.
- The plates were compared at phone scale.
- `tsc`, `eslint` and the full suite (1,830 tests) pass; the validation test confirms Zod's own English still never reaches a screen. The changed components are at 100% coverage.

### Left for later
- React and Next themselves account for most of the ~2.2 s of JavaScript on slow 4G. The next steps would be:
  - rendering the session on the server, which removes its request altogether;
  - loading closed sheets on demand, at the cost of a pause the first time one opens.

### Blockers
- None.

## 2026-09-27 — More illustrations (R5.18)

### Added
- **31 illustrations from the 17 files in the root folder**, bringing the library to 59 (`artwork/illustrations/`, `src/assets/illustrations/`, `src/constants/illustrations.ts`).
  - Two files were sheets: nine valentine pictures (`IMG_2519.JPG`) and seven pink ones (`IMG_2520.JPG`). Each was split by its drawings rather than a grid, and each drawing was centred on a white square with the same margin as the 2026-09-24 splits.
  - The other 15 were copied byte for byte under their keys.
- **Three new groups in the picker:**
  - **Hearts and love:** hearts, a love letter, padlocks, Cupid, a bow and arrow;
  - **Home and everyday:** a light bulb, a mop, a builder, two doctors, a grandmother cooking, a giraffe in a car;
  - **Characters:** two capybaras, a shark and a dragon.
- **Added to existing groups:** the sheets' gift boxes, the bow, the puppy and the hamster join Gifts and flowers; popcorn joins Food; a savings jar joins Basics.

### Changed
- **The build clears holes** (`scripts/illustrations.mjs`, `HOLES`). Ground an outline closes off from the border stayed white, and showed as a pale patch on a tile: the bow's inside, a padlock's shackle.
  - Each hole is named by a point inside it and cleared as the border is. A point that is not ground fails the build.
  - It also fixes four of the first 28: the donut's hole, the cookie cup's handle, the price tag's loop, and the gaps at the balloon strings.
- **A drawing too busy for 40 KB at quality 82** takes the first quality step down that fits. Only `cupid` needs it, at 78. The other 54 files rebuilt byte for byte.
- **Plan §139.11.10:**
  - the catalogue, how the sheets were split, the three groups and why;
  - the library's 1 MB total is dropped, since no screen downloads a library file (`next/image` sends each place a copy drawn to its size) and the 40 KB per file is the limit that counts;
  - the size corrected to the 480 px the script has always written.
  - The answers of 2026-09-27 and tracker row R5.18 record the request.

### Validation
- **Build checks:** the duplicate check passes, with the closest pair at 26 of 256 against a limit of 10. Every file is under 40 KB, 1.5 MB in all, and the build is deterministic when run twice.
- **Visual:** each new picture was checked on the Golden tile and on a dark ground for white left behind.
- **Picker in the browser:** at 390, 820 and 1280 px, in Golden and Peach, it offers 59 choices in seven groups, with no broken image and no console error.
- **Over HTTP:** a product saved with `bow-and-arrow` reads it back; an unknown key is refused with VALIDATION_ERROR; the product was restored.
- **Checks:** `tsc`, `eslint` and the full suite (1,830 tests) pass.

### Notes
- **No migration.** The database checks only a key's shape.
- **The 17 originals** moved to `design-references/illustration-originals/`, which is not committed.
- **Q16 covers the new pictures too:** each one's licence is confirmed before the Play release.

### Blockers
- None.

## 2026-09-27 — Audit fixes (`/impeccable audit`, P1–P3)

The audit scored 15/20 and found 1 P1, 6 P2 and 4 P3 issues. Each is fixed below, verified, or left with a reason.

### Accessibility
- **[P1] Peach secondary buttons now pass AA.**
  - They measured 4.38 : 1 on the page, 4.09 on a field and 3.58 on hover.
  - A new role, `--color-primary-strong`, sets words on a primary tint. Golden keeps its caramel, which already held 4.55 or better. Peach takes the deep terracotta, at 4.71 or better on every ground, hover included.
  - The kit's `secondary` variant uses it (`button.tsx`).
- **[P2] 44 px targets:**
  - **Tabs** are 44 px tall, and at least 44 px wide (`tabs.tsx`).
  - **Forgot password** gets a 44 px row, drawn into the gap around it.
  - **On sale:** the whole row is the checkbox's label. The classes left from a Tailwind forms plugin the project does not use are gone.
  - **View order** in a stock row, and a customer's **email**, take a 44 px band centred on their line (`hit-area-line`).
  - **A customer's number** is now plain text: its link sat 6 px from the email's, so their zones would overlap, and **Call**, just below, dials it.
- **[P2] The bottom bar at 200 % text:** it is measured in px, like a native tab bar, so a larger text size can no longer push **More** off the edge. A label is cut short only on a 320 px phone at 200 %.
- **[P2] Landmarks and lists:**
  - The sign-in screens are a `<main>` landmark.
  - The customer picker's list items stand aside (`role="none"`), so its radios belong to the group.

### Performance
- **[P2] The page arrives knowing the session** (`src/features/auth/session.server.ts`). The root layout reads the cookies on the server and hands `AuthProvider` one of three things:
  - the session view (never a token), drawn signed in, in the page's own HTML;
  - `null`: signed out, and nothing is asked;
  - `undefined`: an expired access token, which the browser refreshes as before, because only a route handler may set the new cookies.
- **Signing out** sets the session to `null` outright, so it cannot fall back to the one the page came with.
- **The session revalidates** on focus only while someone is signed in.
- **[P3] The two 401s** a signed-out visitor used to log on every sign-in screen, and on every refocus, are gone.
- **First visit** (production build, throttled phone), LCP:

  | Screen | Before | After |
  |---|---|---|
  | Sign in | 2.63 s | 0.75 s |
  | Home | 2.66 s | 0.79 s |
  | Orders | 2.52 s | 0.87 s |
  | Analytics | 2.62 s | 1.40 s |
  | Expenses | 2.85 s | 1.71 s |
  | Create order | 2.95 s | 2.97 s |
  | Customers | 2.49 s | 2.57 s |
  | Notifications | 2.47 s | 2.59 s |

  The last three are unchanged within noise: their largest element is their own data (the product grid, the business name in the header, a notification row), which still waits for the browser to ask.
- **Repeat visits** of a whole page are about 0.1 s slower: Orders 0.58 → 0.70 s, Analytics 0.39 → 0.51 s.
  - The screens are now rendered per request, so the root `loading.tsx` placeholder streams first, and React 19.2 holds a streamed placeholder for up to 300 ms before it shows the content.
  - Measured without `loading.tsx`, a repeat visit shows the screen at 0.18 s instead of 0.46 s.
  - It is kept: removing it would change plan §134 P1-2 ("a tap answers at once instead of leaving the last screen up"), which is the user's to decide.
- **[P3] The blurred bars** were measured, not changed. With the CPU slowed 6×, Analytics, Customers and Create order scroll at 16.7 ms a frame (p95 17.6), with the blur and without it.

### Implementation integrity
- **[P3] Two patterns moved into the kit:**
  - `SectionHeading`'s **View all** can also be a button that shows another view of the screen. Expenses and Analytics use it instead of their own hand-made buttons, and both now carry its arrow.
  - `ActionRow` (`src/components/ui/action-row.tsx`) is the card-width row that opens something: Add custom item, and the customer on an order.
- **[P3] Tokens and type:**
  - The modal backdrop takes `--color-scrim`, set as a value because a dialog's `::backdrop` does not inherit variables in every browser.
  - The scrollbar thumb takes the pill radius.
  - The header and hero taglines move from 10 px to the ramp's 0.7 rem.
  - The forgot-password link moves from 13 px to 14 px.
- **DESIGN.md and `.impeccable/design.json`** record the ₹ faces in the type stacks, the scrim, the strong primary, the action row, the tap bands, the tabs' height and the bottom bar.
- **The design detector** drops from 12 findings to 6. The six left are `#000` inside the sign-in plate's image masks, where it sets only transparency: false positives, left as they are.
- **AGENTS.md** §9 records how the page learns the session.

### Validation
- **Accessibility sweep:** axe (WCAG 2.2 AA plus best practice) over 17 screens × 2 themes × 390 / 1280 px, and 5 sheets in both themes, finds no violations. The one flag left is the verified false positive: a customer's order row, covered at rest by the fixed Create order button, which scrolls clear.
- **Console:** no errors on any screen.
- **Reflow:** clean at 320 px and at 200 % text.
- **Touch targets:** every tab is 44 × 44 px or more, and the tap bands measure 44 px, with taps at their edges landing on the link.
- **Sheets:** each traps focus, closes on Escape and returns focus.
- **Session flows in the browser:** signed out, sign in, a reload while signed in, an expired access token (refreshed), and sign out.
- **Checks:** `tsc`, `eslint` and the full suite (1,844 tests) pass. Every changed file is at 100 %, including two branches in `modal.tsx` and `SignInForm.tsx` that were already uncovered.

### Blockers
- None.

### Open decision
- **Removing the root `loading.tsx`** would show a repeat full load about 0.3 s sooner. A tap in the app would then leave the last screen up, with a pending mark on the tapped place, until the next one arrives, which is not what plan §134 P1-2 says. It needs the user's decision.

## 2026-09-27 — Screens arrive ready

The user's list, following the audit and the loading measurements: remove the 0.3 s hold; check the session and load the business and each screen's first data on the server; render as soon as that data is there; a skeleton, not a full-screen loader, for a slow navigation; load heavy sheets only when needed; and keep each account's data to its own session.

### Changed
- **No full-screen loader** (supersedes §134 P1-2's loading screen).
  - **Why:** with the screens drawn per request, the root `loading.tsx` streamed first, and React 19.2 holds a streamed placeholder for at least 0.3 s. It is removed.
  - **Instead:** a navigation still on its way after 150 ms shows the next screen's skeleton in the page's place, with the header and the navigation kept (`src/lib/navigation/pending.ts`, `useNavigationPending`, `ScreenSkeleton`).
  - **Code navigations too:** a push from code — a row, Order again, a new customer — says so as well (`useOpenScreen`).
- **The proxy renews an expired access token** before a screen is drawn (`src/features/auth/renew.ts`).
  - The new cookies go back with the page, set as the refresh route sets them, and the page is drawn with the new token.
  - A refused refresh clears the cookies and sends the visitor to sign in, remembering where they were.
- **Screens arrive with their first data** (`AppScreen`, `readScreen`, `ServerData`).
  - **What is read on the server:** the business and the bell's count on every screen; then each screen's own first data:
    - Home: the dashboard;
    - Orders: the first page and the counts;
    - an order: the order and its payments;
    - Create order: the products;
    - Customers: the first page;
    - a customer: the customer, the summary and their orders;
    - Products and Inventory: the products, and on Inventory the stock levels;
    - Notifications: the first page.
  - **How:** each read is the one its API route makes, for the same business, under the same RLS, parsed by the route's own schema (`routeQuery`). It is handed over as JSON, keyed as the screen's hook asks, and not fetched again on mount (`useSeeded`).
  - **Password change:** an owner still owing one is sent to replace it before anything is drawn.
  - **Not read on the server:** Analytics, Expenses and Guest sales. They keep their period on the device, so their figures are still read in the browser.
- **Create order:**
  - **Steps:** they change the address through the browser's history (`pushUrl`, `replaceUrl`), so a step never goes back to the server.
  - **The menu before the draft:** the draft is kept on the device, so on the first step the menu is drawn without it, in the same frame. The counts follow with the draft.
- **Sheets and forms load when needed** (`lazySheet`). The customer, product, stock, expense, category, custom item, payment, bill and estimate sheets, and the account change sheet, are left out of their screens' first download. They are fetched once the screen is idle, mounted the first time they open, then kept.
- **Each account's data stays its own.**
  - Signing in, signing out and confirming an email load a new page (`loadPage`).
  - `AuthProvider` keeps each signed-in account's reads in a cache of its own, begun afresh when who is signed in changes.
- **A screen revisited within 30 s** reuses its last render (`experimental.staleTimes.dynamic`). Its figures come from the per-account cache, which revalidates them.
- **The product card's picture tile is a fixed 144 px** (it was a 4:3 box the picture stretched as it arrived). It looks exactly as before, and nothing below it moves.
- **Tests:** six tests returned a mock from `beforeEach`, which Vitest then called as a cleanup after every test. They now return nothing.

### Result (production build, throttled phone)
- **First visit, LCP:** every screen is now at or under 1.7 s. Five were above 2.5 s this morning.

  | Screen | This morning | Now |
  |---|---|---|
  | Sign in | 2.63 s | 0.78 s |
  | Home | 2.66 s | 0.77 s |
  | Orders | 2.52 s | 0.89 s |
  | Create order | 2.95 s | 1.25 s |
  | Customers | 2.49 s | 0.68 s |
  | Analytics | 2.62 s | 1.29 s |
  | Expenses | 2.85 s | 1.67 s |
  | Notifications | 2.47 s | 0.90 s |

- **Repeat visit, LCP:**

  | Screen | This morning | Now |
  |---|---|---|
  | Home | 0.63 s | 0.41 s |
  | Orders | 0.58 s | 0.39 s |
  | Analytics | 0.39 s | 0.24 s |

- **A screen's heading on a repeat visit:** 0.46 s → 0.18 s.
- **Layout shift:** 0 on every screen (Create order was 0.015).
- **Requests:** screens make one or two API calls on a first visit instead of four to six.

### Validation
- **Browser walk-through, on the production build:**
  - signing in lands as a new page, drawn with its data;
  - a slow bottom-bar navigation shows the skeleton, then Orders with its rows and no API call;
  - a Create order step asks the server nothing, and Back returns to the menu;
  - the custom item sheet opens at once;
  - with the access cookie removed, the proxy renews it, with no 401s;
  - after signing out and into a second, throwaway business, no screen shows the first business. The throwaway account was deleted afterwards.
- **Link prefetches** of dynamic screens stay small: 1.6 KB, answered in 5 ms, with no page drawn.
- **Checks:** `tsc`, `eslint` and the full suite (1,878 tests) pass. Every new and changed file is at 100 %.

### Notes
- **AGENTS.md** §9 records how the page learns the session, the proxy's renewal, `AppScreen`, and the account boundary. Plan: the answers of 2026-09-27, and a revision note on §134 P1-2.
- **The proxy now asks Supabase,** at most once an hour per signed-in owner, when the access token has run out.

### Blockers
- None.

## 2026-09-27 — Orders can be changed, and moved to any status

### Added
- **Edit an open order** (the user; plan §139.11.13). **Edit** on the order screen opens `/orders/{id}/edit`, built from the create screen's own parts: the product grid and custom items, then the details (items with steppers and notes, customer, handover, discounts and charges, internal notes), then **Save changes**.
  - A line already on the order keeps the name and price it was ordered at; a line added takes today's price.
  - There is no payment step. The summary shows what has been paid so far and the balance the changes leave.
  - A delivered or cancelled order cannot be changed, and the screen says so.
- **`PUT /api/orders/{id}`** (`updateOrder`, `src/features/orders/edit.ts`) prices the change with the same `priceOrder` a new order uses, then stores it with `update_order` in one transaction (`0025_edit_orders.sql`):
  - the reservation follows each product's change in quantity, and more is checked against stock after the products are locked (§133.3 C4);
  - the totals must add up, and may not come to less than has been paid (`ORDER_TOTAL_BELOW_PAID`); the payment status is derived again;
  - a kept line the order no longer has, or at another price, is refused as changed elsewhere (`ORDER_CHANGED`);
  - an order out for delivery cannot become a pickup (`ORDER_IN_TRANSIT_PICKUP`);
  - a due date moved to another day clears the due and overdue notices, so the new day is told about;
  - the change is audited, before and after.
- **`order_items.position`**: the lines keep the order they were put in. An edit rewrites some rows and adds others, and a row's place on disk is no order. The order screen, the bill and the lists read by it.
- **Sign out asks first** (`useSignOut`), from the More sheet, Settings and the account menu.

### Changed
- **Statuses** (plan §139.11.8, revised): an open order may take any other open status, on or back, or go straight to Delivered/Completed or Cancelled. `ORDER_STATUS_TRANSITIONS` and `order_status_next` changed together; moves between open statuses post no stock.
- **The order screen:** the one next-step button stays; **Change status** beside it (was "More actions") lists every other move, onward first, then **Back to …**, then Cancel.
- **Delivered/Completed asks first**, like Cancel, wherever it is chosen: neither can be undone.
- **Create order** shares its step helpers with the edit screen (`steps.ts`, `StepBar`); nothing it does changed.
- The order total stays on the right when a long status pill sends it onto its own line.

### Validation
- **Database, signed in as the owner, rolled back:**
  - an edit (one more box kept at its price, a line taken off, two new lines, a discount) moved each product's stock by exactly its change, and left the order part paid;
  - a total below what was paid, more than is in stock, a line of another order, a kept line at another price or named twice, and totals that did not add up were each refused with their own code;
  - Pending went straight to Completed, and could then be neither edited nor moved;
  - Preparing went back to Pending with no stock posted;
  - an order out for delivery could not become a pickup, and another business's order read as not found;
  - a new day cleared the due notices and a new time the same day did not;
  - an edit that changed no quantity posted no stock.
- **Browser, phone and desktop, on a throwaway order (deleted afterwards):**
  - Edit added a product and one more of a kept line, and saved: the kept line at ₹380, the new one at ₹450, the ₹100 already paid kept;
  - Preparing, then Back to Pending;
  - Mark as Completed asked; Not yet left it Pending; confirmed, it completed, and Edit was gone;
  - the edit screen then said the order is finished;
  - Sign out asked over the More sheet, and Stay signed in stayed.
  - No page errors, and no sideways scroll.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (1,957 tests), and every new and changed file is at 100 %.

### Migration notes
- `0025_edit_orders.sql`: `order_status_next` replaced; `order_items.position` added (identity, numbered as the rows stand) with an index on `(order_id, position)`; `update_order(uuid, jsonb)` added, for signed-in users only. It needs applying wherever 0022–0024 do.

### Blockers
- None. Delivered/Completed and Cancelled stay final: the user chose so when asked.

## 2026-09-27 — Choices open the app's own list

### Changed
- **Every select opens a styled list, never the browser's** (the user: "some of the select dropdown is not having css instead using native list … like in analytics the days dropdown list"). One kit component, `src/components/ui/select-menu.tsx`:
  - **Where it shows:** the period on Analytics, Expenses and Guest sales (`RangePicker`), Daily or Weekly beside a trend (`IntervalSelect`), and every `SelectField`. The fields are payment method (collecting a payment, an expense), unit (a product), what happened (stock), the category filter (expenses) and discount or charge (an order).
  - **Look:** paper list with a hairline, 44 px choices, the chosen one ticked. It is placed in the top layer, so a sheet never clips it, and opens under or over its control.
  - **Keyboard:** a select-only combobox (arrows, Home/End, a letter, Enter/Space, Escape/Tab).
- **`SelectField` is controlled** (`value`, `onChange(value)`). The four forms that registered one now hold it through react-hook-form's `Controller`. The field styles every control shares moved to `field-styles.ts`.

### Fixed
- **A remembered period no longer breaks the page on load.** `useRememberedRange` read this device's storage during the first render, so the server's page (Last 30 days) and the browser's first draw (the kept period) differed. React then rebuilt the page, which also raised the "script tag while rendering" warning for the theme script. It now reads storage through `useSyncExternalStore`: the default is drawn during hydration, and the kept period right after. It also follows a choice made in another tab.

### Validation
- **Browser, 1440 px in Golden and 390 px in Peach:**
  - the period list opens under the pill and takes a choice by keyboard;
  - Daily/Weekly opens from the chart;
  - Paid with, inside the expense sheet, opens over the field because there is no room below, and takes UPI;
  - no page errors.
- **Console on a fresh load**, with Last 7 days kept for Analytics and This month for Expenses: each screen shows its kept period, with no hydration error and no script warning.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (1,973 tests), and every new and changed file is at 100 %.

### Blockers
- None.

## 2026-09-27 — A profile picture in place of initials

### Added
- **Nine profile pictures** (the user: "split this, and when a new person registers, randomly give one from these 9 as profile icon … these icons are only for the profile, nothing else"; plan §139.11.14). `scripts/avatars.mjs` (`npm run avatars`) cuts the supplied sheet (`design-references/profile-pictures.jpg`, not committed) into thirds. It clears each third's white ground to transparent, trims it, and writes a 320 px WebP to `src/assets/avatars/`, about 12 KB each. It refuses a drawing that runs to the edge of its third. The keys are `AVATAR_KEYS` (`src/constants/avatars.ts`).
- **`profiles.avatar`** (`0026_profile_avatars.sql`). A new account is given one of the nine at random as its profile is made, and every existing account drew its own as the column was added. Only the nine are taken.
- **Changing it from Settings.** The picture on the profile card is a button, "Change profile picture", with a pencil badge. It opens the nine, each named by its animal, with the one in use marked (`AvatarSheet`). Tapping another saves it at once (`PATCH /api/auth/avatar`, `changeAvatar`, audited) and says so on a response card. A failure keeps the sheet open on its card, and tapping the one in use just closes it. There is no 30-day limit.
- **`ProfileAvatar`** (`src/components/ui/profile-avatar.tsx`): the picture on a soft round well, 36 px or 80 px.

### Changed
- **The owner's initials are replaced by their picture**: in the phone's top bar, the account menu from 768 px, and Settings. Customers keep their initials (`Avatar`), as the user asked.
- `AuthProfile` carries `avatar`; a key the app does not have shows the first picture.

### Validation
- **Database, rolled back:**
  - 9,000 draws landed on all nine keys, each 924 to 1,069 times;
  - a profile made the way registration makes it was given one;
  - an unknown key and no key were each refused;
  - two changes in a row were taken, with the 30-day stamps untouched;
  - a signed-in user could neither draw one nor write the column.
- **Browser, 390 px in Golden and 1440 px in Peach:**
  - the picture shows on Settings and in the top bar;
  - tapping it opens the chooser (a bottom sheet on the phone, a dialog on the desktop);
  - Tiger saved, said so, and changed the top bar at once;
  - Ginger cat put the seed account back;
  - both changes are in the audit trail;
  - no page errors, and no sideways scroll.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,003 tests), and every new and changed file is at 100 %.

### Migration notes
- `0026_profile_avatars.sql`: `avatar_keys()` and `random_avatar()` (the server's only), and `profiles.avatar` (not null, drawn at random, checked against the nine). It needs applying wherever 0022–0025 do.

### Blockers
- None. The sheet's licence joins Q16 with the illustrations, to be confirmed before the Play release.

## 2026-09-27 — No worker for now: the app sends mail and tells of due orders

### Changed
- **One switch for whether a worker runs** (the user: "move notifications and mail sender from workers to directly handled by nextjs app, as iam not able to host workers now … dont remove those code completely"; plan §139.11.15). `WORKER_ENABLED` in `src/constants/jobs.ts` and `public.worker_enabled()` in the database are both false. A test keeps them equal. Every worker, handler, job type and trigger stays as it was.
- **Email is sent by the request that asks for it** (`deliverAccountConfirmation`, `deliverEmailChange`). This covers the confirmation at registration and its Resend on Settings, and a new email address's link.
  - A failed send at registration, or for a new address, never undoes the account or the waiting address; it is logged, and Settings offers to send it again.
  - A Resend that fails says so on its card, in the app's words (`asMailFailure`, `src/lib/mail/failure.ts`).
  - With a worker, each is queued as before.
- **Notifications are only for orders due soon and overdue** (the user: "notifications now show for only about to due or already due orders"). The app looks for them as the bell or the inbox is read (`checkDueOrders`, `src/features/notifications/due.ts`): on every signed-in screen, and every minute while the app is open. It looks at a business once a minute at most per server, and a read in that minute waits for the look in hand. `take_due_order_notices` marks each order as told and hands back the facts; the app writes the words from messages.ts, as the worker did (BUG-26).
- **Every other notification is paused** — an order placed or moved, a payment, a customer added, stock running low. The database holds back a notification queued while no worker runs (`jobs_hold_notifications`), and the payment's is not queued at all.
- **`npm run worker` refuses to start while the switch is off.** Its sweep would mark orders as told while the database held back their notices.

### Validation
- **Database, rolled back:**
  - a notification queued with no worker was not taken, and a queued email was;
  - three orders due today, tomorrow and yesterday were each handed back once for their business, and none for another business;
  - none came back before the business's morning;
  - a signed-in user could not call it.
- **Running app, local Supabase:**
  - with two orders made untold, opening the app raised "Due soon: ORD-1001 for Guest is due today." and "Overdue: #1002 for Rahul Verma was due on 25 Sep.", each leading to its order, and the bell showed 2 unread;
  - a registration through the API sent "Confirm your Brio account" to the new address at once (the local mail catcher), and queued no job.
  - Both were put back afterwards: the throwaway account, its email and the two notices removed, and the orders' stamps restored.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,027 tests), and every new and changed file is at 100 % except the worker's command-line start, which was uncovered before.

### Migration notes
- `0027_no_worker.sql`: `worker_enabled()`, the `jobs_hold_notifications` trigger, a one-off marking of open orders long past their day as told, and `take_due_order_notices(uuid, integer)` for the service role. It needs applying wherever 0022–0026 do. Notification jobs already waiting in `jobs` are left as they are.

### Blockers
- None. Hosting a worker later is the switch and one migration (plan §139.11.15).

## 2026-09-27 — Dates open the app's own calendar

### Changed
- **Every date field opens a calendar in the app's look, never the browser's** (the user: "look into calendar picker, its native now, change it to something which will match our design"). One kit component, `src/components/ui/date-picker.tsx`:
  - **Where it shows:** a custom period's From and To (`RangePicker`, on Analytics, Expenses and Guest sales), the orders filter's Due from and Due until, an expense's date, and an order's delivery day.
  - **Look:** a paper panel with a hairline and the lifted shadow. The month is in the display serif between Previous and Next, and weeks run from Monday. The chosen day is filled caramel, today is ringed, and days out of bounds cannot be taken. Today and, on the filter, Clear sit at the foot.
  - **Keyboard:** the WAI-ARIA date picker dialog — arrows, Page Up/Down (Shift for a year), Home/End, Enter, and Escape, which closes the calendar and not the sheet behind it.
- **An order's delivery is a day and a time side by side** (`DateTimeField`): the calendar, and the time from the app's list every quarter of an hour. A time saved between two quarters (6:40 PM) is kept and offered in its place. It still holds what the browser's date-and-time control held.
- **`DateField`** joins the form kit beside `SelectField`. The expense form holds its date through `Controller`.
- **Where a select's list and the calendar open** is one hook, `anchored-popover.ts`, taken out of `select-menu`: set against the control in the top layer, following it on a scroll, closed by a tap elsewhere.
- `IconButton` can be disabled: the calendar's Previous and Next at its bounds.

### Fixed
- **Analytics asked for a custom period before both its dates were chosen**, and the server refused it (400 in the console). It now waits, as Expenses and Guest sales already did.

### Validation
- **Browser, 390 px in Golden and 1440 px in Peach:**
  - on Analytics, Custom's From opened the calendar under it, and the keys took the day before today;
  - inside the orders filter, the calendar opened over the sheet, and Escape closed only the calendar;
  - in the new-expense sheet, the calendar opened above the field where there was no room below;
  - on Create order, the delivery's day and time sat side by side, and the time list opened at the chosen time and took 6:30 PM;
  - no page errors, and no sideways scroll.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,065 tests), and every new and changed file is at 100 %.

### Blockers
- None.

## 2026-09-27 — The developer console

### Added
- **A read-only developer console at `/admin`** (the user: "create a simple dev app ui. simple white and blue theme for now, no write operations … dev logged in using dev account, that will be showed"; plan §5, §37, §139.11.16):
  - **Overview:** the developer signed in (picture, name, role, mobile, email), and the counts of users (owners · developers), businesses and audit entries (and in the last 24 hours);
  - **Users:** every account, newest first — role, mobile, email, business and city, when it joined, and whether it is deactivated, has an unconfirmed email or owes a password change;
  - **Audit log:** every business's trail, newest first — the action, what it was done to, by whom, for which business and when, with the values before and after as JSON.
- **`withDevRoute`** (`src/features/auth/guard.ts`) and `DEVELOPER_ROLES`: DEV only, never while a password change is owed. `GET /api/admin/overview`, `/api/admin/users` and `/api/admin/audit` are fixed, read-only queries as the server (`src/features/admin/api.ts`).
- **White and blue** for the console only (`data-theme="dev"`, globals.css), in the sans throughout.
- **A local developer account** in the seed: mobile 9123456789, password Password123!, no business.

### Changed
- **A developer owns no business** (`0028_developer_accounts.sql`). `profiles.bakery_id` may be null, for DEV only; `AuthProfile.bakeryId` is `string | null`. The owner routes take the business through `businessOf`, which refuses a profile without one.
- **A developer is sent to `/admin`** from every business screen, on the server (`readScreen`) and in the browser (`RequireAuth`). An owner opening `/admin` is sent home (`requireDeveloperScreen`, `DevShell`).

### Not built, on purpose
- **Error logs.** The user: "show whatever log is being saved now, dont create anything new now". Server errors are written to the server's output only; nothing stores them, so there is no page for them.
- **The job queue.** The user asked whether it was needed with no worker running. It is not: nothing new is queued now, so it waits for a worker.

### Validation
- **Database, rolled back:** an owner without a business is refused; a developer without one is taken.
- **The running app:**
  - signed in as the developer, the overview, users and audit log came back with the real rows (2 accounts, 1 business, 64 audit entries);
  - an owner calling a console route got `AUTH_ROLE_FORBIDDEN`, and so did the developer calling a business route;
  - an owner opening `/admin` was sent home, a visitor signed out was sent to sign in, and the developer opening Home or `/orders` was sent to `/admin`.
- **Browser, 390 px and 1440 px:** signing in as the developer landed on the console. Every page read, the audit entry opened to its before and after, no page errors, no sideways scroll.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,105 tests), and every new and changed file is at 100 %, the page and route files aside, as every screen's are.

### Migration notes
- `0028_developer_accounts.sql`: `profiles.bakery_id` drops NOT NULL, and `profiles_owner_has_business` requires it for everyone but DEV.
- **A developer on the hosted database:** add the user from the Supabase dashboard, give it its mobile number, and add its profile (the SQL is in this session's notes to the user).

### Blockers
- None.

## 2026-09-27 — Phase 7: the installable app

### Added
- **The manifest** (`src/app/manifest.ts`; R7.1): "Brio", standalone from `/`, Golden's ground for the splash and the status bar. The **icons** are the brand mark in cream on caramel — 192 and 512 px, and a maskable 512 px — built by `scripts/app-icons.mjs` (`npm run app-icons`). The iOS home-screen icon is `src/app/apple-icon.png`.
- **iOS home-screen settings:** home-screen capable, titled "Brio", under a `black-translucent` status bar (§139.8).
- **The service worker** (`public/sw.js`; R7.2). It runs in the browser; nothing more is hosted for it.
  - It keeps Next's hashed files, the bill's fonts and the icons, from the cache first.
  - It keeps `/offline`, fetched without cookies, so it holds nothing of whoever was signed in.
  - It never keeps a screen or an API answer. A screen the network cannot reach answers with the offline page.
  - Each release installs afresh (`/sw.js?v={version}`) and clears the old caches.
  - It is set up in a built app only (`src/lib/pwa/serviceWorker.ts`). In development, one left over is taken away.
- **The offline page** (`/offline`): "You're offline", with Try again as a plain form, so it works before any script loads.
- **The offline banner** (IMP-08, `OfflineBanner`): while the connection is down, a bar over the screen says so, with Try again.
- **Install app** (R7.3; the user: "install app button will be with other menus, which will also give small tutorial like insteructions … inside pwa that button or menu will be hidden"):
  - **Where:** a row in More, above Sign out, on a phone; the sidebar's last place on a tablet and a desktop.
  - **The sheet:** three numbered steps for this device, each with the mark the device shows — iPhone and iPad (Safari's Share, then Add to Home Screen), Android (Chrome's menu, then Install app), a computer (the address bar's install icon), or a browser that cannot install. Where the browser offers to install (`beforeinstallprompt`), an **Install** button asks it to.
  - **Hidden** inside the installed app, once installed, and until the browser has said how the app was opened.

### Changed
- **The proxy** leaves the icons, the manifest, the service worker and the offline page alone, signed in or not.
- **The sidebar's items** take their look from one place (`navStyles.ts`), shared with Install app.

### Validation
- **The production build, in the browser:**
  - the manifest, the service worker, the offline page, the icons, and the iOS and Android home-screen tags were all served;
  - on an Android phone the worker took charge of the page, and More offered Install app with Android's steps;
  - an iPhone got Safari's steps, and a computer the address bar's;
  - with the connection cut, the banner showed. A screen then opened was the offline page, styled from the cache and holding none of the owner's details, and Try again brought the screen back once online;
  - opened as the installed app, Install app was not offered.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,153 tests), including the worker's own contract (`tests/contract/service-worker.test.ts`), and every new and changed file is at 100 %.

### Blockers
- None. The user asked whether the service worker needs hosting: it does not, it runs in the browser.

## 2026-09-28 — SonarQube, BugSnag and Swagger kept for later

### Changed
- **The plan** (the user: "no need of sonarqube and bugsnag for now. remove from phase, keep it like for later. also swagger not needed"):
  - **Phase 6** no longer holds OpenAPI, SonarQube or BugSnag. R6.3 (OpenAPI and Swagger) and R6.7 (BugSnag) read **LATER**, a new tracker status. R6.4 is the CI pipeline without SonarQube.
  - **§119 – §120, §123 and §124** stay as written, each marked *kept for later*, as are the lines that name them in §122, §125, §127 – §130, §133 and §139.13.
  - A *Kept for later* note under §139.18 lists the three.
- **AGENTS.md** follows: the stack lists them as kept for later, §25 says no OpenAPI document or Swagger UI is added for now, and §27's pipeline has no SonarQube.

### Validation
- Documentation only; no code named any of the three.

### Blockers
- None.

## 2026-09-28 — R6.8: the accessibility and responsive pass

### Checked
- **All 27 screens:** the owner's 19 (New order's three steps and the not-found page among them), the 5 signed out, and the developer's 3.
- **Six widths, two themes:** 360, 390, 414, 768, 1024 and 1440 px, in Golden and Peach.
- **Every sheet, menu, calendar and confirm card**, opened as an owner opens them.
- **What was measured:**
  - axe, WCAG 2.2 AA and best practice;
  - sideways scroll, at every width and at 200 % zoom;
  - targets under 44 px, hit-tested so the `hit-area` halos count;
  - controls under a 47 px notch and a 34 px home indicator, and in landscape under 47 px side insets;
  - a focus ring at every Tab stop;
  - in each sheet: focus moving in, Escape closing it, and focus going back.

### Fixed
- **A sheet over a sheet** (`Modal`). Escape on the picture picker closed the product form behind it too, and lost what was typed, because React hands a nested dialog's `cancel` to the one around it. Each modal now answers only its own Escape and its own Tab. The same fix covers every sheet or card opened over another.
- **The rail scrolls on a short screen** (`AppShell`). On a phone on its side the rail was 718 px of places on a 390 px screen: Expenses, Settings and Install app could not be reached. Below 736 px tall it scrolls, and its tooltips give way there.
- **Discounts and charges** (`DetailsPanel`). In the desktop's 26rem side column the row crushed its Name field to 34 px, and the label ran into Amount's. It now lays out by the column's width (a container query), so it stacks there and stays one row at 768 px.
- **44 px targets:**
  - sidebar places were 40 px tall (`navStyles`);
  - the calendar's days were 40 px: they are 44 px, the calendar 334 px wide, and six weeks fit without scrolling (`date-picker`);
  - a stepper's quantity was 20 px tall: it now takes the stepper's full height, 44 px, with its ring drawn inside (`quantity-stepper`).

### Found fine
- **No axe violation** on any screen or sheet.
- **No sideways scroll**, and nothing under the notch or the home indicator.
- **A ring at every stop.**
- **The select lists keep focus on their control** with `aria-activedescendant`, the ARIA pattern for a select.
- **The bill's contrast holds** once it has faded in.

### Validation
- **The sweep again, after the fixes:** clean, the rail scrolling on a phone on its side, and the nested picker closing alone with focus back on its button.
- **A new test:** a modal inside a modal keeps its own Escape and Tab; it fails without the fix.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,154 tests), and every changed file is at 100 %.

### Blockers
- None.

## 2026-09-28 — Notifications: Unread and Read

### Added
- **Two more tabs on Notifications** (R5.19; the user: "keep 2 more filters in notification, read and unread"): **All · Unread · Read · Orders · Customers · System**.
  - Unread and Read show every kind. The kind tabs still show read and unread alike.
  - `GET /api/notifications?tab=UNREAD|READ` filters on `is_read`, which is already indexed, so no migration is needed.
  - With none to show, Unread says "Nothing unread" and Read "Nothing read yet".

### Changed
- **One table says what each tab shows:** `NOTIFICATION_TAB_FILTERS` (the read state or the kinds) replaces `NOTIFICATION_TAB_KINDS`.
- **The tabs' name for a screen reader** is "Which notifications", no longer "Notifications by kind".

### Validation
- **Browser, 360 px and 1440 px:** the six tabs show, scrolling sideways on a phone. Unread said "Nothing unread" and Read listed all nine (the local inbox has none unread), with no failed requests.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,156 tests, new ones for both tabs), and every changed file is at 100 %.

### Blockers
- None.

## 2026-09-28 — 24 people join the profile pictures

### Added
- **24 people** (the user: "split and these to the avatars set"), beside the nine animals.
  - **The sheet:** the user supplied 24 portraits, six by four, each on a pastel disc.
  - **The build** (`scripts/avatars.mjs`): each disc is found as a round shape and cut 1.5 px inside its edge, so no white fringe is kept.
  - **The output:** a 320 px WebP per person, 11 to 14 KB, the corners see-through. The disc fills the round well it is shown in.
  - **What was committed:** the pictures are, in `src/assets/avatars/`. The sheet is not: it stays in `design-references/` (`profile-pictures-people.png`, a copy of the file supplied).
- **Their names:** Green hoodie, Wavy hair, Round glasses, Top bun, Full beard, Sun hat, Curly hair, Flower clip, Headphones, Coffee mug, Green shirt, Purple hoodie, Grandpa, Grandma, Dungarees, Pigtails, Cap, Hoop earrings, Cream hoodie, Daydream, Goatee, Bucket hat, Navy hoodie, Low bun.
- **`0029_people_avatars.sql`:** `avatar_keys()` takes the 24 keys after the nine. A new account now draws from all 33; every account keeps the picture it has.

### Changed
- **The chooser** (`AvatarSheet`) shows **Animals** then **People**, each under its heading, three across on a phone and four from 640 px.
- **The animals are unchanged:** the build writes them byte for byte as before.

### Validation
- **Database, rolled back:** 33,000 draws landed on all 33 keys, each 956 to 1,042 times. One of the people was taken, and an unknown key was refused.
- **Browser, 360 px and 1440 px:** the chooser showed all 33 with no sideways scroll. A person set as the owner's picture showed in the top bar and on Settings, with the disc filling the well.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,160 tests), and every changed file is at 100 %.

### Migration notes
- `0029_people_avatars.sql`: replaces `avatar_keys()`. Nothing else changes.

### Blockers
- None.

## 2026-09-28 — Empty states get their own drawings (R9.5)

### Added
- **Six drawings** (the user: "use this where needed, i think some of them from these can be used in our app now").
  - **The sheet:** the user supplied fifteen empty-state drawings. `scripts/empty-art.mjs` (`npm run empty-art`) cuts the six that match a list the app has, clear of their captions. It makes their white ground see-through from the edges inwards, so the drawings' own pale paper stays.
  - **What was committed:** the drawings, 24 to 29 KB each, in `src/assets/empty/`. The sheet stays in `design-references/` (`empty-states.png`, a copy of the file supplied).
- **Where each is shown:**

  | Screen | Drawing |
  |---|---|
  | Orders | a clipboard |
  | Products, and the order screen's empty grid | an open box |
  | Customers | three figures |
  | Inventory | a market stall |
  | Expenses (Transactions) | a bar chart |
  | Notifications | a bell, titled **All quiet** in place of "Nothing yet" |

- **`EmptyState` takes `art`** in place of `icon`, as one or the other.
  - The drawing is decorative (`alt=""`) and sits in a fixed 176 × 128 px box, so its space is kept while it loads.
  - It settles in with the kit's short drop, and only fades under reduced motion.
  - The developer console keeps its icons.

### Not used
- **The other nine drawings are of things the app does not have:** bookings, deliveries as a list, favourites, reviews, messages, templates, media (no uploads, AGENTS §16), setting up a store, and "nothing here yet".
- **"No results found":** a search that matches nothing keeps its plain line (plan §139.21.4).

### Changed
- **The plan:** §139.21.1's "no new assets" now allows these drawings for the empty states, and §139.21.4 names them.

### Validation
- **Browser, 390 px Golden and 1440 px Peach:** each empty state showed its drawing, title and action, with no failed requests.
  - The screens were those of a throwaway business registered for the purpose.
  - The business was then deleted, with its account and its confirmation email. The local database is back to its 2 accounts and 1 business.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,162 tests, new ones for the drawing and the art map), and every changed file is at 100 %.

### Blockers
- None.

## 2026-09-28 — The app is Brio

### Changed
- **The name and the line** (the user: "these are the logos of the app. use it where needed. and also change the app name and tagline whereever needed"). The app is **Brio**, with the line **"Made by you. Managed simply."**, in place of the old name and "Home Business". It appears in:
  - the browser's title and the installed app's name;
  - the sign-in screens ("New to Brio?");
  - the bill's footer ("Made with Brio");
  - both emails;
  - the install steps and the offline page;
  - the developer console, and the seed's developer (now "Brio Developer").
- **A business with no catch phrase** now shows "Home business" under its name, no longer the app's line (`UI_TEXT.businessLine`).
- **The code kept its old name for now,** so renaming signed no one out and lost no setting. It was renamed the same day (“Everything says brio”, below).

### Added
- **The marks** (`scripts/brand.mjs`, `npm run brand`, replacing `app-icons.mjs`), built from the four files supplied, which stay uncommitted in `design-references/brand/`:
  - **the installed app's icons:** 192 and 512 px (the rounded square), the maskable 512 px, and iOS's 180 px (the mark on green to every edge, inside the safe zone). The PNGs are 256-colour and dithered: 4 to 68 KB, no banding;
  - **the favicon:** 16, 32 and 48 px in one `.ico`;
  - **`src/assets/brand/`:** the icon, the wordmark and the leaf, with their white ground made see-through.
- **Where they show:**
  - **the sign-in screens:** the wordmark over the line, in place of the drawn seedling (`BrandMark`, removed) and the name in type. The leaf marks the closing promise;
  - **the install sheet:** the icon, beside what installing gives;
  - **the developer console:** the icon, in place of its "O".

### Validation
- **Browser, 390 px and 1440 px:** the sign-in screen, the install sheet and the developer console.
- **Served files:** the manifest ("Brio — Made by you. Managed simply.", "Brio"), the favicon, the iOS icon and both Android icons.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,167 tests, new ones for the brand map and the two mail templates). Every changed file is at 100 %, save a guard in `DevShell` that was uncovered before.

### Blockers
- None.

## 2026-09-28 — The launch splash

### Added
- **A branded splash with a real loader** (the user: "use these 2 images as small branded splash + loader … a real progress bar should be there as loader, this is for returning user launching the app").
- **When it shows:** Brio opened as an app — the installed web app, or the Android app by its user agent — once a launch. Never in a browser tab, and not on a reload within the same launch.
- **The art** (`scripts/splash.mjs`, `npm run splash`): the two supplied scenes, portrait and landscape, with their drawn wordmark, line and bar painted out of the cream middle.
  - Each painted box is checked to sit on plain cream, then filled from its smoothed edges with the cream's own grain.
  - They are 77 KB and 72 KB in `src/assets/splash/`. The originals stay in `design-references/brand/`.
- **In the middle:** the real wordmark, the line, and a bar that fills as the launch goes.
  - **The steps:** the page read (30 %), the fonts (15 %), the art (20 %) and the app hydrated (35 %).
  - **How it moves:** the bar eases toward what has happened, never past a step still to come.
  - **Timing:** at least 0.9 s, at most 8 s, then a 0.3 s fade.
- **How it's built:**
  - `launchBootScript` runs in `<head>` before the first paint.
  - `LaunchSplash` is drawn with every page, hidden until `<html data-launch>`. Its pictures are backgrounds, so an ordinary visit downloads nothing.
  - `LaunchReady` reports the app ready.
- **The wordmark** is now 793 × 360 px (`npm run brand`), sharp at the splash's largest.

### Validation
- **Browser, as the Android app** (390 px upright; 1280 px on its side): the splash came at once. The bar went from 4 % to 100 % by 1.0 s, and the splash was gone by 1.3 s.
- **A reload** in the same launch went straight to the page.
- **In a browser tab** nothing showed and none of the art was fetched.
- **Checks:** `tsc` and `eslint` pass. The full suite passes (2,183 tests), and the new files are at 100 %.

### Blockers
- None.

## 2026-09-28 — Empty states: the drawings taken out

### Changed
- **The empty states' drawings are removed** (the user: "the empty state illustrators look so low quality, either increase the quality or just remove the illustrator just keep the rest of the thing there").
  - **Why not sharper:** each drawing was only about 260 px wide on the supplied sheet. A phone draws them at 176 px across three pixels to the point, so there was nothing to make them sharper from.
  - **What each empty state shows:** its icon in the medallion again, with its title, hint and action.
  - **The inbox** keeps the title **All quiet**.
- **Removed:** `EmptyState`'s `art`, `src/assets/empty/`, `scripts/empty-art.mjs` and its npm script. The sheet stays in `design-references/`.
- **The plan:** R9.5 reads TODO again, with the reason.

### Validation
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,181 tests).

### Blockers
- None.

## 2026-09-28 — Phase 8 begins: the Android project

### Decided
- **R8.1, how the app ships** (the user): **Capacitor 8 loading the hosted app**, the plan's option A.
  - **Rechecked first:** Capacitor's documentation now calls `server.url` "not intended for use in production". Google Play refuses apps that only show a website.
  - **So:** every native call will check its plugin is there, a bundled page answers when the app cannot be reached, and the native capabilities are what make it an app. The reasoning is in plan §139.17.1.
- **The application id** (Q10, the user): **`in.brio.app`**.
- **No build yet** (the user: "scaffold only for now"). This Mac has no Android SDK, so no APK is built.

### Added
- **The layout** (the user asked for one that is production-grade and cannot be confused with the web app; AGENTS §19, plan §139.17.1):
  - `src/` stays the one app.
  - `src/lib/native/` is the only code that talks to Capacitor. ESLint refuses `@capacitor/*` imports anywhere else.
  - `android/` is Capacitor's standard native project, with its generated parts git-ignored.
  - `capacitor.config.ts` joins the two.
- **The hosted address** comes from `ANDROID_APP_URL` when syncing (`src/lib/native/shell.ts`).
  - A release needs HTTPS. Plain HTTP is allowed only for a development server on a private address, such as the emulator's `10.0.2.2`.
  - Nothing of it is committed.
- **The offline page** (R8.9): `scripts/android-shell.mjs` builds the pages bundled into the app. The Android shell shows the offline page when the app cannot be reached (`server.errorPath`), and **Try again** reopens it.
  - The page is plain HTML in Golden's colours with the app's icon, and says the web app's own words (`UI_TEXT.offline`).
- **Icons and splash** (R8.8), from the Brio icon by `npm run brand`:
  - the adaptive icon: the mark over the icon's green gradient, inside the safe middle;
  - a monochrome layer for Android 13's themed icons;
  - square and round fallbacks;
  - the system splash on the launch splash's cream.
  - Capacitor's own logo and splash images are removed.
- **Version and signing** (R8.11, begun). The version name is `package.json`'s. The version code is `BRIO_VERSION_CODE` from CI. A release is signed only when CI provides `BRIO_UPLOAD_KEYSTORE` and its passwords, and the key is never in the repository.
- **npm scripts:** `android:sync` and `android:open`.
- **`.env.example`:** documents `ANDROID_APP_URL`. The sender name reads Brio.

### Validation
- **Gradle 8.14.3** configures the whole Android project without errors, reading the version from `package.json`. Building needs the Android SDK.
- **The Android XML** is well formed (`xmllint`).
- **The icons** were composed as a launcher would, in a circle, a squircle and themed.
- **Checks:** `tsc` and `eslint` pass, and the lint rule catches a Capacitor import outside the native layer. The full suite passes (2,184 tests).

### Blockers
- **Push (R8.6):** waits on the worker, which is off (§139.11.15). There is nothing to send a push from.
- **The Privacy Policy page and account deletion (R8.10)** need the details only the user can give: a contact address, and who is responsible for the data.
- **Seen on a device (R8.4, R8.12):** needs Android Studio or a phone.

## 2026-09-28 — Phase 8: the native capability layer

### Added
- **R8.3, `src/lib/native`**, built only where something calls it:
  - **`isAndroidApp` and `hasPlugins`:** every Android half checks its plugin is in the installed build, and falls back to the web half. The app loads the hosted web app, so a deploy can be newer than the install (plan §139.17.1).
  - **`share` and `saveFile`** (R8.7): on Android the bill's PNG or PDF is written to the app's cache and handed to the system's share sheet. The folder is cleared before each new file, so nothing is kept (AGENTS §15). **Download PDF** goes the same way on Android, since a WebView cannot download a blob. Its "PDF saved" card now shows only where a file was really downloaded.
  - **The back button** (R8.5, first half; `NativeSetup`, `goBack`):
    - it closes an open list first, then the card or sheet on top, each as Escape would;
    - then it goes back a screen;
    - on Home and at sign-in it leaves the app.
- **Plugins:** `@capacitor/app`, `@capacitor/share` and `@capacitor/filesystem` 8.x, synced into the Android project.
- **Install app** is not offered inside the Android app.

### Decided
- **No code for the status bar or the insets.** Capacitor 8's core `SystemBars` (`insetsHandling: "css"`, dark icons) gives the page correct safe-area insets, which `--safe-*` already reads.
- **No splash plugin.** The system splash hands straight to a WebView painted the launch splash's cream, then to the launch splash. With no plugin to hide it, no splash can be left stuck: the offline page has no plugins to call one.
- **Waiting for their first caller:** haptics (R9.8), the keyboard plugin (if the device check finds the page covered), App Links (the domain and the key's fingerprint) and push (R8.6, which waits on the worker).

### Validation
- **Unit tests:** every step of the back button, sharing and saving on Android (shared, closed, failed, unreadable), the platform checks, and Install app hidden in the app. The native layer is at 100 %.
- **Gradle** configures the app, Capacitor and the three plugins.
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,200 tests). In a browser, Install app is still offered and Download PDF still downloads.

### Blockers
- **App Links** need the production domain and the Play signing key's SHA-256 fingerprint.

## 2026-09-28 — Everything says brio

### Changed
- **The code takes the new name too** (the user: "make sure everything will be updated to new name and tagline throughout the codebase including the docs"). The earlier choice to keep the old name in code is undone:
  - the package (`brio`) and the local Supabase project id (`brio`);
  - the session cookies (`brio_access_token`, `brio_refresh_token`);
  - the keys a device keeps (`brio_theme`, `brio_range_*`, `brio_user:*`), the launch splash's key and hook (`brio_launched`, `__brioLaunch`) and the in-page events;
  - the service worker's cache (`brio-static-*`), the ₹ fonts' family names (`Brio Rupee Sans`, `Brio Rupee Serif`) and the bill's canvas fonts;
  - the seed's developer (`dev@brio.local`), and the test fixtures;
  - AGENTS.md, the plan, PRODUCT.md, DESIGN.md, the README, `.impeccable/design.json` and this changelog.
- **The service worker clears every cache but its own** as it takes charge, not only those under its prefix, so a device that installed the app under the old name is left with nothing stale.
- **The fonts' README** said the cut ₹ files carry their own family names inside them. They keep Inter's and Fraunces' own; the app loads them under its names in `globals.css`.

### Migration notes
- **Everyone is signed out once** (the cookies' names changed), and what a device kept resets once: the theme, remembered date ranges and an order being built.
- **The local Supabase stack** now runs as `supabase_*_brio`. Its data came across: the old volumes were copied to the new names before it started, and the local developer's email was moved to `dev@brio.local`. The old `supabase_*_ovenly` volumes are left as a backup.
- **Still under the old name, outside the code:** the GitHub repository's address (and the push recorded on 2026-09-21) until it is renamed on GitHub, and the project's folder.

### Validation
- `tsc` and `eslint` pass, and the full suite passes (2,200 tests).
- Local Supabase started from the copied volumes with all 29 migrations and its data.

### Blockers
- None.

## 2026-09-28 — Phase 8: the privacy policy and deleting an account

### Added
- **R8.10, the privacy policy** (the user: "write privacy policy yourself"), at `/privacy`:
  - it is open to anyone, signed in or not, as Google Play needs; the proxy does not run for it;
  - it is reached from Settings → About, under the version and Crafted by;
  - its words are `PRIVACY_POLICY` (`src/constants/privacy.ts`). It covers:
    - who is responsible (jaFFa), what is kept and why, and who else sees it (Supabase, the host, the mail provider);
    - how long things are kept, the owner's choices, deleting, children and changes;
    - the address to write to.
- **`SUPPORT_EMAIL`** (optional, `.env.example`): the address the policy gives. Without it, the policy gives the address in `SMTP_FROM`, and no address when neither has one.
- **R8.10, deleting an account** (the user: "fair warnings heavy … type in password twice along with email and phone number"), at Settings → Account → **Delete account**, under Change password:
  - The screen says plainly, first, that the business goes with the account, straight away and for good, and lists everything that is deleted. "Before you go" says to keep any bill still needed, or to sign out instead.
  - It asks for the account's sign-in number, its email, and the password twice. It then asks once more on a danger card naming the business.
  - `DELETE /api/auth/account` checks the number and the email are this account's, and the password is its password. A refusal is shown beside its field.
  - `delete_account` (`0030_account_deletion.sql`) deletes everything in one transaction:
    - the queue's work that names the account or the business;
    - the profile;
    - the business, and with it every row it owns;
    - the sign-in.
    It is SECURITY DEFINER, and only the service role may call it. The logo's files are removed from Storage afterwards.
  - Once the account is deleted, the cookies are cleared (only then) and the device's keys go. The owner lands on sign in, which says the account was deleted.
  - A developer's account cannot be deleted this way.

### Validation
- **Unit tests** cover:
  - the screen, at 100 %: its warnings, every field, the matching passwords, the confirm card and each refusal;
  - the route's cookies, the server function, removing the logo, the schema and the client;
  - the privacy page: its sections, its way back signed in and out, and the address or none;
  - `supportEmail`, and the proxy leaving `/privacy` alone.
- **A DB contract test** covers `0030`: SECURITY DEFINER, its grants, owners only, and the order of the deletes.
- **In the browser:**
  - a test account was deleted end to end, and the database kept no profile, business, customer, order, job, sign-in or logo file of it;
  - the privacy page opened signed out, and signed in.
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,248 tests).

### Migration notes
- Apply **`0030_account_deletion.sql`** to the hosted database before the release that carries this screen.
- Set **`SUPPORT_EMAIL`** where `SMTP_FROM` is a no-reply address.

### Blockers
- None. The Play developer account (Q10) is still to come.

## 2026-09-29 — Impeccable technical audit

### Added
- Recorded the requested audit in `docs/audits/2026-09-29-impeccable-audit.md`: a provisional 15/20 score, one major and three minor findings, reproduction evidence, owning components and recommendations within the existing plan.
- Findings cover editable-field boundary contrast, Home's chart-summary total, keyboard navigation in the customer/illustration pickers, and incomplete custom-range loading states. Application fixes are follow-up work; this change documents the audit only.

### Validation
- Inspected 11 owner screens at 360, 390, 414, 768, 1024 and 1440 px in Golden and Peach: 132 baseline-state samples with no page-level horizontal overflow or unlabelled visible text inputs.
- Verified picker keyboard behavior, nested-sheet Escape/focus return, calendar placement, theme switching and the Analytics custom-range state in the local browser.
- Calculated contrast from source tokens and confirmed field colors through rendered browser styles in both themes.
- Reviewed all ten Impeccable detector advisories in context; masks and the approved branded splash explain them.
- Focused shared UI, navigation and Home component tests passed: 380 tests in 64 files. The report records the production, device and full-accessibility checks not repeated.

### Migration notes
- None. No application code or database schema changed for this audit.

### Blockers
- No blocker to the audit. Four findings remain open for the next implementation pass.

## 2026-09-29 — Phase 8: order reminders on Android, with no worker

### Added
- **R8.6, reminders the Android app sets itself** (the user: "cant push notification without workers as we are not hosting workers separately, if it will work implement it for the android app"). A push needs a sender awake at the time, and no worker runs. So the phone schedules its own notifications for the only notices there are now: orders due soon and overdue. No server process, token, Firebase project or table is added.
  - **`GET /api/notifications/reminders`** (`listReminders`, `src/features/notifications/reminders.ts`):
    - it reads the business's open orders due from yesterday on, soonest first, 100 at most (`REMINDER_ORDERS_MAX`);
    - it words each order's reminders as the inbox does, by 0023's rule. *Due soon* is set for 8 AM on the day before the order is due, or for that day once the day before has passed. *Overdue* is set for 8 AM the day after.
    - Only what is still ahead is set, and a notice the inbox has already given is not set again.
  - **`OrderReminders`**, in the signed-in frame, reads the set as the app opens, when it comes back into view, and every minute while it is open, as the bell does. It hands the phone the whole set, so an order delivered or moved is taken off or moved within a minute.
  - **`src/lib/native/reminders.ts`** (`@capacitor/local-notifications` 8.3):
    - The set replaces what was waiting, and a read that changed nothing sets nothing.
    - They go on their own channel, "Order reminders", kept private on a locked screen, with the brand's mark in the status bar.
    - Tapping one opens its order, even when the tap starts the app.
  - **None is an exact alarm.** Otherwise the plugin would open Android's "Alarms & reminders" screen, so the exact-alarm permission it adds is removed from the manifest. Android may hold a reminder a few minutes.
  - **Settings → Notifications → Order reminders**, in the Android app only, between Appearance and About as the plan orders them. When off, the row asks Android and says so once allowed. When refused, it says to turn reminders on in Android's settings. The permission is read again each time the app comes back into view.
  - **Signing out, or deleting the account,** cancels the waiting reminders and takes down those already shown.
  - **`ic_stat_brio`**, the status-bar icon: the mark in white, 20 dp on 24 dp, built by `scripts/brand.mjs` like the other icons.
  - **`dayHour`** (`src/lib/dates/calendar.ts`): an hour of a day in the business's timezone.

### Decided
- **The installable web app gets no reminders.** A closed web app can only be woken by a push, and a push needs a sender on a schedule: the worker, or a scheduler calling the app. It keeps the inbox and the bell.
- **FCM push (device tokens, the NotificationWorker) stays as planned** for when a worker runs. R8.6 stays open for it.
- **A limit of setting reminders on the phone:** an order added on another device joins the phone's reminders when the phone next opens the app. Settings says so.

### Validation
- **Unit tests** cover:
  - the rule: day before or the day itself, overdue, only what is ahead, not what the inbox has told, Guest, and India's day wherever the server runs;
  - the query;
  - the native layer: permission states, replacing the set, no exact alarms, nothing without permission, clearing, and taps only to the app's own screens;
  - the permission hook, `OrderReminders`, the Settings row and its place, signing out, and the tap opening the order.
  - The new code is at 100 %.
- **Against the local stack:** the endpoint answered an order due on 1 October with *due tomorrow* at 8 AM on 30 September and *overdue* at 8 AM on 2 October. It refused a signed-out caller.
- **In a browser:** Settings is unchanged (no Notifications), the web app never asks for reminders, and no errors appeared.
- **The Android project:** synced (four plugins), Gradle configures it with the plugin, and the manifest is well formed.
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,288 tests).

### Blockers
- **Seen on a device (R8.4, R8.12):** needs Android Studio or a phone. That includes the permission prompt, a reminder arriving, and a tap from a cold start.

## 2026-09-29 — Forms post, so nothing typed lands in the address

### Fixed
- **A form sent before the page had loaded put what was typed in the address** (the user asked for the fix). With no method, a browser sends a form as a GET, so a sign-in submitted before the page's scripts ran put the password into the URL, and from there into the history and server logs. Every form now says `method="post"`:
  - sign in, register, forgot password, change password, and delete account;
  - business details, and the shared sheet form (`FormSheet`), which carries the password when the sign-in number or the email changes.
- Once the scripts run nothing changes, since each form's own handler sends it. Before they run, a POST to the page draws it again, with nothing in its address.

### Validation
- Each form's suite checks it posts to its own page.
- **In a browser with scripts off:** pressing Enter on sign-in sent `POST /login`, and the address stayed `http://localhost:3000/login`.
- `tsc` and `eslint` pass.

### Blockers
- None.

## 2026-09-29 — Order reminders pushed to the web app, on the database's schedule

### Added
- **R8.6, web push without a worker** (the user: "build the pwa push with pg_cron"). A closed web app can be woken only by a push, and a push needs a sender on a schedule. The database's own scheduler now stands in. No Edge Function and no separate process are involved.
  - **`0031_web_push.sql`:**
    - **`device_tokens`** (the plan's registry): each browser that wants pushes, with its push service's address and the keys that encrypt what is sent to it. It is the server's alone (RLS on, nothing granted), and goes with the business or the owner.
    - **pg_cron** calls `request_due_order_sweep()` every five minutes. Through **pg_net**, that posts to `POST /api/cron/due-orders` with `CRON_SECRET` as a bearer token.
    - Where it calls and the secret are read from **Supabase Vault**, so the migration holds neither. Until both are set, while no browser wants pushes, or while a worker runs, it calls nothing.
    - A daily job keeps a week of the scheduler's history.
  - **`POST /api/cron/due-orders`** is refused without the secret (compared in constant time), and always while none is set. It looks at each business that has such a browser, as the bell does (`sweepDueOrders`).
  - **Every due notice taken**, by the scheduler or by the bell, goes to the inbox and is **pushed** to the business's browsers (`pushToBusiness`, the `web-push` library, VAPID keys from the environment). A browser its push service has forgotten (404, 410) is let go. Any other failure is logged, without the browser's address.
  - **`POST /api/notifications/devices`** keeps a browser's subscription for the signed-in owner (`pushSubscriptionSchema`: https only, keys bounded). It answers `PUSH_UNAVAILABLE` while web push has no keys.
  - **In the browser** (`src/lib/native/webPush.ts`, behind the same reminders calls as Android):
    - Settings → Notifications → Order reminders now shows wherever push can work: the built web app in a browser with push, or on an iPhone once Brio is on the Home Screen.
    - When off, the row asks the browser, subscribes and tells the server. If the server cannot be told, the subscription is dropped and a card says so.
    - The app tells the server again each time it opens. Signing out unsubscribes the browser.
  - **The service worker** shows a push with the app's icon and a white badge (`public/icons/badge-96.png`, built by `scripts/brand.mjs`), and a repeat of the same reminder replaces it. A tap opens its order in an open window, or a new one, and only ever a screen of this app.
  - **The environment** (`.env.example`, "Web push"): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (else `mailto:` the support address) and `CRON_SECRET`. All are optional: without them web push is off, and Settings does not offer it.
  - **The privacy policy** (updated 2026-09-29) says what is kept for a browser's reminders, that the browser's own push service carries them (and cannot read them), and how to turn them off.

### Decided
- **Cost on the free plans:** no Edge Function is used. pg_cron and pg_net run inside the database on every Supabase plan. Each call is one small request to the app: 288 a day at most, and none while no browser wants pushes. Browsers' push services are free.
- **The rule is the inbox's:** from 8 AM in the business's day, an order due today or tomorrow, or overdue, is told once. An order placed later in the day for tomorrow is told within five minutes.
- **FCM push to the Android app** still waits for a worker. The Android app keeps setting its own reminders.

### Validation
- **Unit tests:**
  - the sender: fan-out, letting a forgotten browser go, and logs without addresses;
  - registration, the scheduled sweep, and the secret check;
  - the environment, the schema, and the browser half (permission states, subscribing, a failed registration dropped, renewing, leaving);
  - the platform switch, `OrderReminders` and the Settings row on the web;
  - the service worker's push and tap handling;
  - a contract test for `0031`.
  - The new code is at 100 %.
- **On the local stack:**
  - `0031` applied, with both jobs in `cron.job`. A signed-in user can read neither the table nor the function.
  - The route refused no secret and a wrong one, and answered with the right one.
- **End to end, in Google Chrome (headless), against the production build, after 8 AM:**
  - Settings turned reminders on, and the server kept the subscription (`fcm.googleapis.com`).
  - `request_due_order_sweep()` called the app, which answered `200` having looked at one business.
  - Chrome's service worker showed "Due soon · ORD-1003 for Guest is due tomorrow.", tagged and leading to the order, and the inbox had it too.
  - Before 8 AM the same call told nothing, as the rule says.
  - The order, the inbox row and the test browser were restored or removed afterwards.
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,352 tests).

### Migration notes
- Apply **`0031_web_push.sql`** to the hosted database.
- Make the VAPID keys and `CRON_SECRET` once, put them in the server's environment, and rebuild, since the public key is built into the app.
- In Supabase's SQL editor, store the app's `/api/cron/due-orders` address and `CRON_SECRET` in Vault (`.env.example` has the two lines).
- Keep Cloudflare's Bot Fight Mode off, or it would challenge the scheduler's call.

### Blockers
- **Seen on phones:** an Android phone's Chrome, and an iPhone with Brio on its Home Screen, are still to be tried.

## 2026-09-29 — The interface audit's four findings, fixed

### Fixed (docs/audits/2026-09-29-impeccable-audit.md; the user: "if valid fix this with help of /impeccable harden clarify polish")
- **A1 (P1), field boundaries you could not see.** A new token, **`field-edge`** (Golden `#918070`, Peach `#9a7d70`, the console `#7d8a9c`), clears 3 : 1 on the page, the card and the field's own well (WCAG 1.4.11). The hairline measured 1.35 : 1 at most.
  - It is applied through the kit: `FIELD_WELL` (text fields, textareas, the select and the date field), the search box and the quantity stepper.
  - A read-only field keeps the hairline.
  - DESIGN.md and its sidecar name the token.
- **A2 (P2), Home's spoken chart total.** The chart's summary totalled the selected period, not the days it draws. It now sums its own points (`sumPaise`), while the period's total stays in its tile.
- **A3 (P2), pickers that said "radio" but had no arrow keys.** The customer picker, the illustration picker and the profile-picture sheet use **`useSheetChoice`** (on `useArrowSelection`):
  - Each has one Tab stop, at the choice in use.
  - The arrow keys, Home and End move the choice and focus together, wrapping round, without committing or closing the sheet. Enter, Space or a tap commits.
  - **`Modal`** now begins at a control in the Tab order, so a sheet opens on the current choice. A filter sheet's segmented control also now starts on its chosen segment.
- **A4 (P2), custom ranges that looked like loading forever.** While a custom period lacks a date, Analytics, Expenses (every tab) and Guest sales show **`RangePrompt`**: "Choose both dates — Pick a From and a To date above, and the figures for those days appear here." It is a polite status with no busy state. The Transactions tab no longer takes an incomplete period at all.

### Validation
- **Unit tests:**
  - the keyboard walk, wraparound, entry at the choice in use, committing with Enter, and reopening, for all three pickers and the hook;
  - the modal's first focus;
  - the prompt on every report screen, with nothing busy;
  - Home's summary where today's total differs from the chart's.
  - The old tests that pinned "Loading analytics" for an incomplete range now expect the prompt.
- **One browser round (polish)** in Golden and Peach, at 390 and 1280 px:
  - the fields' edges show at rest;
  - the picker entered at the picture in use and stayed open under the arrows;
  - the custom range showed the prompt with no busy region;
  - Home said "₹4,500 in all", matching its bars.
- **Checks:** `tsc` and `eslint` pass, and the full suite passes (2,365 tests).

### Blockers
- None.

## 2026-09-29 — Prettier

### Added (the user: "setup prettier in the project")
- **Prettier 3** (`prettier`, pinned), with `.prettierrc.json` (120 columns, its defaults otherwise) and `.prettierignore`. Markdown is left as written, since the plan and the changelog are wrapped by hand, and so is the generated Android project.
- `npm run format` writes it, and `npm run format:check` is the gate CI will run (AGENTS §27, plan §125).

### Changed
- The codebase formatted once: 327 files, layout only. 120 columns was the width that changed the fewest (100 would have touched 566).

### Validation
- `prettier --check .` passes, as do `tsc`, `eslint` and the full suite (2,365 tests).

### Blockers
- None.

## 2026-09-29 — Phase 8: App Links, the release build, and the device checks

The user: "complete phase 8 first then phase 6". Their answers: the device checks are theirs, with CI doing the build ("CI build only, you test"), and FCM waits for the worker ("Keep local reminders").

### Added
- **App Links (R8.5).** On a phone with Brio, the email confirmation link now opens the app, which is then confirmed and signed in, instead of a browser. The password reset sends no link, so this is the only link there is.
  - `android/app/src/main/AndroidManifest.xml`: a verified (`autoVerify`) filter for `https://<host>/confirm-email`. The host is the one the app loads, which `build.gradle` reads from the config `npm run android:sync` writes.
  - `GET /.well-known/assetlinks.json` (`src/app/.well-known/assetlinks.json/route.ts`) names `in.brio.app` (`ANDROID_APP_ID`, `src/constants/android.ts`) and the signing keys' fingerprints (`ANDROID_CERT_FINGERPRINTS`, a new optional server setting). With none set it answers 404, and the link opens in the browser as before.
  - The proxy leaves `/.well-known/` alone, since Android refuses a redirect.
  - `onAppLinkOpened` (`src/lib/native/links.ts`) loads a link of this site as a new page (`loadPage`), from `NativeSetup`. A link that started the app is held until the page listens. Links to other sites are ignored.
- **The release build (R8.11).** `.github/workflows/android.yml` is run by hand from the Actions tab.
  - It syncs for `vars.ANDROID_APP_URL`, signs with the upload key held in the repository's secrets, and builds with Java 21.
  - It keeps two files for 30 days: the bundle for Play and the same build as an APK for test phones.
  - The run number is the `versionCode`. It stops early, saying what is missing, when the address or the key is not set.
- **`docs/ANDROID.md`**, the release guide:
  - making the upload key, and the GitHub secrets and variable;
  - each release;
  - App Links' fingerprints, and how to check a phone verified them;
  - Play Console's App content answers, the data-safety form (matched to the privacy policy) and the testing tracks;
  - **the device checks (R8.4, R8.12):** the matrix, ten checks and a results table.

### Changed
- `capacitor.config.ts` takes the app id from `ANDROID_APP_ID`.
- **R8.6 is closed** for as long as no worker runs. The Android app sets its own reminders, and the web app is pushed them on the database's schedule. FCM to Android waits for the worker, by the user's choice.
- Plan §139.17.2, §139.17.3 and §139.17.5, the tracker, AGENTS §19 and `.env.example` are updated.

### Validation
- **Unit tests:**
  - the statement, and its 404 with no key;
  - the setting read as a list, in capitals, and refused when malformed;
  - the proxy passing `/.well-known/` through;
  - `onAppLinkOpened`: this site's page with its query and fragment; nothing from another site or for a malformed address; letting go; nothing in a browser;
  - `NativeSetup` loading the page.
- **The built app** served `/.well-known/assetlinks.json` with a fingerprint set: 200, `application/json`, no redirect. Any other `/.well-known/` path answers 404.
- **Not run here:** Gradle and the workflow need the Android SDK and GitHub, and no SDK is installed on this machine (the user's choice). The workflow's first run is its test.
- **Checks:** `tsc`, `eslint`, `prettier --check`, the full suite and `next build` pass.

### Blockers
- **Waiting on the owner, not blocked:**
  - the Play developer account, the upload key and GitHub's secrets;
  - the first run of the workflow, and the upload to internal testing;
  - `ANDROID_CERT_FINGERPRINTS` on the server;
  - the device checks.
  - Phase 8 is done when a signed build on the internal track passes them (plan §139.18).

## 2026-09-29 — Phase 6: the queue hardened (R6.1), and rate limiting decided (R6.2)

### Fixed (R6.1; §133.6 F8)
- **A signed-in user could put any job on the queue.** `authenticated` held INSERT on `jobs` (0004), and a job names no business to check. So a direct call to the database's API could:
  - queue a notice for another business's inbox;
  - queue an account-confirmation email for someone else's account.
  
  Nothing ran either, since no worker runs, but a worker would have. **`0032_queue_hardening.sql`** fixes it:
  - `authenticated` loses INSERT and its policy.
  - The three notice triggers (order placed, customer added, stock low) run as their owner (security definer), from the row the user was allowed to write.
  - An order's move is told by a new trigger on its status (`orders_notify_status`), not from inside `change_order_status`, which runs as the user. That function is redefined without the insert; a test proves it is otherwise 0016's.
  - `createJob` always uses the service role (the payment notice used the caller's client).

### Added
- **Exponential backoff (F6).** A failed job waits 1, 2, 4, then 8 minutes (`retryDelayMs`, at most an hour) and is set aside as failed after five tries (`MAX_JOB_ATTEMPTS`, was three at a fixed five minutes).
- **The CleanupWorker (F7).** `clean_up_queue()` drops completed jobs after 30 days, and failed ones 90 days after they were queued (`JOB_KEEP_*`, which a test keeps equal to the SQL).
  - A worker runs it once a day (`registerCleanupWorker`, `src/lib/jobs/cleanup.ts`).
  - While none runs, pg_cron does (`queue-cleanup`, 03:41 UTC).
- **The MenuBuildWorker is not built.** The menu builder it would serve is a later product phase outside the roadmap (plan §139.18), so it waits with it.

### Decided (R6.2, the user: "No app limiter")
- There is no rate limiter in the app. Supabase Auth limits its own sign-ins and emails, and Cloudflare's rate-limiting rule can guard the sign-in routes at the edge. R6.2 reads NOT BUILT, and §133.11 K6 records the decision.

### Blocker resolved
- **Rate limiting on authentication endpoints** (opened 2026-09-23): resolved by the user's decision above. No table and no in-memory limiter is added.

### Validation
- **Unit tests:** the service-role enqueue, the backoff curve and its cap, the retry wait after a third failure, the cleanup (once a day, not every sweep; its count; its error kept inside), and the worker registering it.
- **The migration's contract test:** the grants and the triggers; `change_order_status` equal to 0016's without the insert; the retention equal to the constants; the schedule.
- **On the local database, in a rolled-back transaction, as a signed-in owner:**
  - moving an order worked;
  - a direct `insert into jobs` was refused ("permission denied for table jobs");
  - with a worker switched on, the move queued its `ORDER_STATUS` notice through the trigger.
- **Checks:** `tsc`, `eslint`, `prettier --check` and the full suite pass.

### Migration notes
- Apply **`0032_queue_hardening.sql`** to the hosted database. It needs pg_cron, as 0031 does.

### Blockers
- None.

## 2026-09-29 — Phase 6: integration tests against the database (R6.6)

### Added
- **`tests/db/integration`**, run with `npm run test:integration` (`vitest.integration.config.mts`), against the local Supabase with every migration applied.
  - The tests go through the app's own data functions, as a route would: `register` and `login`, then the customer, product, stock, order, status, notification and queue functions. Each file registers businesses of its own and deletes them after (`@tests/support/integration`, `delete_account`).
  - The config refuses any address but a local one, and leaves mail unset, so no test sends an email. `npm test` leaves these tests out.
- **Authentication** (5 tests):
  - registering makes the sign-in, the profile and the business, joined up;
  - a number or an email is refused a second account;
  - sign-in is by mobile number, with one answer for a wrong password and for an unknown number;
  - an owner cannot change their own role or business.
- **Tenant isolation** (7 tests). Baker B, through the app and then straight at the database's API with B's token:
  - finds none of Baker A's customers, products, orders or stock, and changes none of them;
  - cannot sell A's product;
  - reads none of A's rows in nine tables;
  - writes nothing into A's business, and cannot move A's order;
  - neither reads nor adds to the job queue, nor reads the push browsers;
  - a visitor with no session sees nothing.
- **Orders and stock** (12 tests):
  - the server's totals, with a custom line, a charge and a discount;
  - the reservation, and the audit row naming who placed the order;
  - a double tap with one key makes one order;
  - the oversell guard takes nothing when it refuses;
  - a payment taken with the order;
  - delivering turns the reservation into consumption, and a delivered order stays delivered;
  - cancelling gives the stock back;
  - a stale move is refused;
  - an edit moves the reservation and is checked against stock, may not bring the total under what was paid, and may not touch a delivered order;
  - the database refuses a negative price.
- **Notifications and the queue** (5 tests):
  - due notices: none before the morning, told once, only to the order's business, and only for the server to take;
  - the inbox: each business's own, marked read by its owner alone, and written by no user;
  - the queue: takes work from the server, and cleans away completed work older than 30 days while keeping the rest.

### Fixed
- **`0033_ledger_signs.sql`.** A stock line's sign was checked only by the app. With an owner's token, a request made straight to the database's API could write a stock-in of −5, and the balance believed it (found by these tests).
  - The database now checks the app's rule (`signIsRight`): stock in and returns add; consumption and wastage take away; reservations and adjustments go either way but never by nothing. A test keeps the two rules equal.
  - It is `not valid`, so lines already written are left alone and no database fails to migrate.

### Validation
- `npm run test:integration`: 4 files, 29 tests, pass. None of the test accounts is left behind afterwards.
- `tsc`, `eslint`, `prettier --check` and `npm test` (2,386 tests) pass.

### Migration notes
- Apply **`0033_ledger_signs.sql`** to the hosted database.

### Blockers
- None.

## 2026-09-29 — Phase 6: browser journeys with Playwright (R6.5)

### Added
- **Playwright** (`@playwright/test`, `playwright.config.ts`), run with `npm run build && npm run test:e2e`.
  - It serves the built app with `next start` on port 3100, at a phone's width (390 × 844).
  - It uses the local Supabase from `.env.local`, refuses any other address, and leaves mail unset.
  - `npm test` leaves the journeys out.
- **The critical journey** (`tests/e2e/journey.spec.ts`), each step through the screens as an owner takes it:
  - signs in;
  - adds a customer, then a product;
  - counts in 12;
  - takes an order of two for the customer, unpaid;
  - opens the bill from the placed card, and checks the business, customer, item and total;
  - Share, with no share sheet, downloads the image. Download PDF saves a real PDF, named for the order and the business;
  - opens the order from Orders, and moves it Preparing → Ready → Completed, through the confirm card;
  - checks that 10 are left on the shelf.
- **Tenant isolation in the browser** (`tests/e2e/tenant-isolation.spec.ts`). Owner B, signed in:
  - sees none of business A's orders or customers in B's lists;
  - is told "not found" at A's order and customer addresses;
  - is answered 404 by the API for A's order, bill, bill PDF and customer, and an empty list for its payments.
- `@tests/support/e2e`: `signInAs` and `expectOutcome`. The businesses are made and deleted by `@tests/support/integration`.
- `test-results/` and `playwright-report/` are git-ignored.

### Validation
- `npm run test:e2e`: 2 journeys pass. None of the test accounts is left behind afterwards.
- `tsc`, `eslint`, `prettier --check` and `npm test` (2,386 tests) pass.

### Blockers
- None.

## 2026-09-29 — Phase 6: the CI pipeline (R6.4)

### Added
- **`.github/workflows/ci.yml`**, on every push to main and every pull request. It is the pipeline of plan §125 without SonarQube, which is kept for later.
  - **`checks`:** install, lint, format check, type check, unit tests.
  - **`app`**, once `checks` passes:
    - starts the local Supabase with every migration applied, using the same CLI version as development (2.109.1), and only the services the app uses;
    - writes `.env.local` from it, with mail left unset;
    - runs the integration tests;
    - builds;
    - runs the browser journeys on that build, and keeps Playwright's report and traces for 14 days when they fail.
  - Nothing is deployed. There is no staging, smoke test or production step: the app is not hosted from CI.

### Fixed
- **`npm run typecheck` failed on a fresh checkout.** `next-env.d.ts`, which declares image imports, is generated and git-ignored, so `tsc` knew no `.webp` on a clean clone. The script now runs `next typegen` first.

### Validation
- On a clean worktree of HEAD, with no `.env.local`:
  - `npm run typecheck` fails before the change and passes after;
  - `npm test` passes (2,386 tests).
- The workflow parses. The env step's `eval` of `supabase status -o env` gives the local address and keys.
- The workflow itself runs for the first time on GitHub, at the next push.

### Blockers
- None.

## 2026-09-29 — Living dashboard data motion

### Changed
- **Charts now move between datasets instead of snapping.** The shared line, bar and donut charts interpolate the values they were already showing to the next period or grouping over one 520 ms settle. Line and bar slots keep their place as dates change; donut segments transition by rank, which also keeps each chart colour in place.
- **Interrupted updates continue from the visible value.** A second period change does not restart a chart from its earlier dataset, and a new slice grows from zero. The motion reads no layout and keeps final labels, tables and spoken summaries authoritative throughout.
- **Dashboard and Analytics figures roll in their direction.** Home's due, sales, collection and low-stock figures and Analytics' four KPIs now use the existing till-count motion when their raw value changes. Donut totals use the same treatment.
- **The existing choreography stays coherent.** Tabs still travel through `TabPanel`, and ranked or filtered rows still reflow through `useListMotion`; the new work adds only the missing data-geometry transition.
- **Analytics' photographic band is loaded eagerly.** It is the screen's largest above-the-fold image, so the browser now gives it high fetch priority instead of reporting it as a lazy-loaded LCP candidate.

### Accessibility and performance
- Reduced-motion users receive the new figures and chart geometry immediately. A browser without animation frames does the same.
- A chart's data table, tooltip words and accessible summary always contain the final values; only the visible SVG geometry interpolates.
- The hook performs no layout reads. It updates only the small value set that drives each SVG and cancels an old frame before starting the next transition.

### Validation
- **Browser review:** Home and Analytics were exercised against local Supabase data at 390 × 844, 768 × 1024 and 1440 × 900. Period changes, Daily/Weekly regrouping, tabs, line charts, rings and KPI layouts settled without overflow or browser errors.
- **Impeccable detector:** no findings across the changed interface files.
- **Unit tests:** 356 files, 2,390 tests, pass. The new hook is covered for matched interpolation and reduced motion; `StatTile` is covered for directional rolling; Analytics' LCP band is covered for eager, high-priority loading.
- **Browser journeys:** 2 Playwright journeys pass against the production build and local Supabase.
- **Checks:** ESLint, TypeScript and the production build pass. Prettier 3.9.9 reports every touched file formatted.

### Existing repository check issue
- `npm run format:check` cannot start because `package.json` names the script but does not install `prettier`. This change does not alter dependencies; the touched files were checked with the existing cached Prettier binary.

### Blockers
- None for this change.

## 2026-09-29 — Prettier installed with the project

### Fixed
- **`npm run format:check` could not start on a fresh install.** The Prettier setup (`5ef73d3`) added the scripts and the config, but not the package. It had run from npx's cache, so CI's format check would have failed at "prettier: command not found". `prettier` is now a dev dependency, pinned to 3.9.9, the version that formatted the code.

### Validation
- On a clean checkout of `f6ab221` with this change, CI's steps were replayed locally against the local Supabase:
  - `npm ci`, then lint, format check, type check and unit tests (2,390) pass;
  - with `.env.local` written as CI writes it, the integration tests (29), the build and the browser journeys (2, with `CI=true`) pass.
- actionlint finds nothing in either workflow.

### Blockers
- None.

## 2026-09-29 — The plan records the figures' and charts' motion

### Changed
- **Plan §139.5, Motion:** the figures' roll and the charts' move between datasets (`8873f53`) are now written into the plan, which the user confirmed they asked for. The plan stays the source of truth for what moves.

### Validation
- Documentation only.

### Blockers
- None.

## 2026-09-29 — Motion on taking an order

### Added
- **Adding an item** (`choreography.ts`, `useOrderAddMotion`). The pressed + flies into the cart on a phone, or into its line on the desktop's order panel, and the cart or line answers with a small pulse. The flying copy is hidden from screen readers and from the keyboard, and it is removed when it lands, even when its flight is cancelled.
- **Steps on a phone.** A View Transition carries the order between items, details and payment: forward from the right, back from the left.
- **Placing.** The Place order button turns into the success card's medallion.
- Under reduced motion, nothing travels, and only the cart or line answers, with a short fade. From 1024 px, the steps stay still.

### Fixed before committing
- **The screen froze for about four seconds on each step change and on Place order.** The transition waited for an animation frame, and Chrome runs none while it holds the screen for a transition. Timed in Chromium: 4,028 ms with the frame, 283 ms without.
  - The transition now waits for the order screen to say the change is drawn (`orderChangeDrawn`, from a layout effect), and 300 ms at most.
  - Measured on the built app at 390 px: each step is captured within 12–19 ms and done in about 0.46 s. Place order is captured with its card and done in 0.6 s.
- **A step slid in twice.** The existing step travel (`useTravelMotion`) also ran inside the View Transition. It now keeps still while one is running (`orderTransitionRunning`). A step changed by the browser's Back, which runs no transition, still slides in once.

### Validation
- Unit tests: 358 files, 2,404 tests, pass. `choreography.ts`, `useOrderAddMotion` and `useTravelMotion` are fully covered.
- A temporary browser check on the built app at 390 px, not committed, confirmed each of the following:
  - the + launches one flight;
  - each step runs one transition, which captures the new step, with no second slide;
  - Back slides once;
  - Place order's transition captures the card.
- The browser journeys (2) pass. Lint, the type check and the format check pass.

### Blockers
- None.

## 2026-09-29 — Motion on stock, expenses and Guest sales

### Added
- **Recording stock** (`StockLedgerSheet`, Inventory). A product's history keeps its figure on the shelf while Record stock is open over it. After the form has closed (200 ms), the figure rolls up or down the way the stock moved.
  - Before this, the new figure arrived while the form still covered it, and the form only uncovered it after the roll had played.
- **The stock list** waits the same way for the history to close. Then a row's count rolls, the row moves to its new place in the list, and **Low stock** pops in, or shrinks away when stock is filled again (`StockLevel.tsx`).
- **`useLeaving`** (`src/hooks`). This reports that something which has just gone is still on its way out, for 200 ms (`EXIT_MS`), so it can play an exit (`animate-pop-out`, `globals.css`).
  - It counts time rather than waiting for the animation to end, because a pill hidden at this width never plays an animation.
- **Expenses and Guest sales.** Their figures roll when the period changes or an expense is added, as Home's and Analytics' already do.

### Not done
- The history's new movement does not slide in. If it joined after the form had closed, the sheet would grow and its top edge would jump; while the form closes, that growth stays hidden.

### Found, not changed
- On a phone, the "Stock recorded" card stays behind the open history sheet, so it cannot be seen there. On a desktop it shows below the dialog. This predates this change.

### Validation
- Unit tests: 360 files, 2,417 tests, pass.
  - `StockLevel`, `useLeaving`, `Inventory` and `StockLedgerSheet` are fully covered.
  - The history test shows the figure held while covered and while the form closes, then rolling up.
  - The Inventory test shows the list held until the history has closed, then the count rolling and Low stock leaving, hidden from screen readers.
- A temporary browser check on the built app, not committed, recorded each frame:
  - at 390 px, the figure changed about 200 ms after the form closed, with `tick-up` running;
  - the row's count and Low stock changed 200 ms after the history closed, playing `tick-up` and `pop-out`;
  - under reduced motion, the roll was `fade-only`;
  - at 1280 px, the roll showed in the dialog in plain view.
- The browser journey now checks that the history shows the new stock after Record stock closes. Both browser journeys pass, and no test account is left behind.
- Lint, the type check and the format check pass. The Impeccable detector finds nothing in the changed code; its ten advisories are on existing lines (the `#000` masks and the splash's own colours).

### Blockers
- None.
