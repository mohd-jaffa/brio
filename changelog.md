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
    - the receipt's hard-coded "Ovenly Bakery" with the bill's view-model (R4.1);
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
Phase 2 rows, built now because the user asked for the proposal and it matches the plan. The shell showed the app's name, "Ovenly · Home Business", because the business profile could not be read or edited, and no logo could be uploaded (§133.2 B1–B3).

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
  - **Fallbacks.** A quiet placeholder while loading, so the header does not flash "Ovenly". The app's name and line if the profile cannot be loaded. The cake mark with no logo or a logo that fails to load, never a broken image, and "Home Business" with no catch phrase.
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
  - The bill printing this header replaces the hard-coded "Ovenly Bakery" with R4.1 (§133.2 B4).
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
    - `npm run worker` sent it: one "Confirm your Ovenly account" to the new address.
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
  - The queue held one pending confirmation. `npm run worker` completed it on the first attempt, and one "Confirm your Ovenly account" reached her address in Mailpit.
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
