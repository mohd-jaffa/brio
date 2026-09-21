# Changelog

All notable changes to this project will be documented in this file.

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
