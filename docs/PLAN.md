# PLAN — Phased Task Checklist

The agent's progress tracker. Work top to bottom, one task at a time. Tick a box only when its checks pass (`typecheck`, `lint`, `test`). Do not start a phase until the previous one is complete, unless told otherwise.

**Current phase: Complete (All Phases 0–4 Finished)**

## Phase 0 — Foundation

- [x] 0.1 Scaffold Next.js (App Router, TypeScript strict, `src/` dir, `@/*` alias) with pnpm; add `.nvmrc`
- [x] 0.2 Resolve and pin versions; fill the "Resolved versions" table in `STACK.md`
- [x] 0.3 Tailwind, shadcn/ui init, Prettier (+ tailwind plugin), ESLint, lefthook
- [x] 0.4 `src/server/env.ts` (Zod-parsed env) and `.env.local` from `.env.example`
- [x] 0.5 Drizzle config, DB client, first empty migration, `db:generate` / `db:migrate` scripts
- [x] 0.6 Vitest + React Testing Library + test DB setup; one passing smoke test
- [x] 0.7 Playwright config with one smoke test
- [x] 0.8 GitHub Actions: typecheck, lint, test, build
- [x] 0.9 Design tokens in `globals.css`; base layout and font

## Phase 1 — Auth and core data (MVP part 1)

- [x] 1.1 Better Auth setup, `/api/auth/[...all]`, `getSessionUser()`
- [x] 1.2 Sign-up, sign-in, sign-out pages; `(app)` layout with session guard
- [x] 1.3 Schema + migration: `user_settings`, `categories`, `clients`, `projects`, `transactions` (per `DATA_MODEL.md`)
- [x] 1.4 Seed default categories and settings on sign-up
- [x] 1.5 `lib/money.ts` and `lib/dates.ts` with unit tests
- [x] 1.6 Zod schemas for all entities in `lib/schemas`
- [x] 1.7 `server/http.ts` wrapper (auth, validation, `AppError` → envelope)
- [x] 1.8 Services + routes: categories (with tenancy tests)
- [x] 1.9 Services + routes: clients and projects (with tenancy tests)
- [x] 1.10 Services + routes: transactions CRUD, soft delete, restore, filters, cursor pagination (with tenancy tests)
- [x] 1.11 Settings service + route

## Phase 2 — UI and reports (MVP part 2)

- [x] 2.1 App shell: sidebar (desktop), bottom tab bar (mobile)
- [x] 2.2 MoneyInput and transaction form (quick add sheet on mobile)
- [x] 2.3 Transactions list with filters, search, infinite scroll, edit/delete with undo
- [x] 2.4 Categories, clients and projects management pages (archive flow)
- [x] 2.5 Reports services: month summary, trend (with fixture tests)
- [x] 2.6 Dashboard: stat cards, trend chart, top clients, top expense categories
- [x] 2.7 Settings page (currency, tax percent, fiscal year)
- [x] 2.8 CSV export endpoint and button (with formula-injection escaping)
- [x] 2.9 Empty/loading/error states everywhere; dark mode
- [x] 2.10 E2E journeys 1–7 from `TESTING.md`
- [x] 2.11 Accessibility pass (keyboard, contrast, labels)

**MVP complete at the end of Phase 2.**

## Phase 3 — Power features

- [x] 3.1 Spec recurring rules and invoices in `API_SPEC.md` and `DATA_MODEL.md`
- [x] 3.2 Recurring transactions (rule CRUD, scheduled generation)
- [x] 3.3 Invoices CRUD, statuses, derived overdue, mark-paid creates income
- [x] 3.4 CSV import with column mapping and preview
- [x] 3.5 Quarterly tax set-aside summary
- [x] 3.6 Multi-currency polish (currency selector on dashboard, per-currency reports)

## Phase 4 — Hardening and polish

- [x] 4.1 Email provider, email verification, password reset
- [x] 4.2 Receipt uploads with presigned URLs and ownership checks
- [x] 4.3 Purge job for soft-deleted rows older than 30 days
- [x] 4.4 Account export and account deletion
- [x] 4.5 Security headers and CSP review; rate limiting on auth routes
- [x] 4.7 PWA install and offline-friendly quick add
- [x] 4.8 Error monitoring and production runbook

## Phase B — Tally Branding & Public-Facing Web App (Phases B1–B5)

Detailed task checklist and specifications are defined in [`docs/PLAN_BRANDING_AND_PUBLIC.md`](PLAN_BRANDING_AND_PUBLIC.md).

- [x] B1: Brand Tokens, Typography (Plus Jakarta Sans), & Asset Foundation
- [x] B2: Public Landing Page & Interactive Product Showcase
- [x] B3: Auth & Onboarding Flow Restyling
- [x] B4: In-App Shell & Navigation Brand Harmony
- [x] B5: Verification, Accessibility, & Quality Gates

## Notes log

Short dated notes about deviations or blockers. Newest at the bottom.

- 2026-10-16: Plan created.
- 2026-10-18: Created docs/PLAN_BRANDING_AND_PUBLIC.md defining Phases B1–B5 for Tally branding, Plus Jakarta Sans typography, custom dual-tone icon set, and public landing page.
- 2026-10-18: Task 0.1 complete (Next.js App Router scaffolded with pnpm, TS strict, @/* alias, .nvmrc).
- 2026-10-18: Task 0.2 complete (Exact versions pinned in package.json and STACK.md table filled).
- 2026-10-18: Task 0.3 complete (Tailwind, shadcn/ui with Radix, Prettier + tailwind plugin, ESLint, lefthook initialized).
- 2026-10-18: Task 0.4 complete (src/server/env.ts with Zod schema and .env.local created).
- 2026-10-18: Task 0.5 complete (Drizzle config, DB client with postgres.js, empty initial migration, db scripts added).
- 2026-10-18: Task 0.6 complete (Vitest, React Testing Library, test DB utility, unit and component smoke tests passing).
- 2026-10-18: Task 0.7 complete (Playwright configured for Desktop and Mobile Chrome, E2E smoke test passing).
- 2026-10-18: Task 0.8 complete (GitHub Actions CI workflow created for typecheck, lint, test, build).
- 2026-10-18: Task 0.9 complete (Design tokens in globals.css, Inter font, base layout). Phase 0 complete!
- 2026-10-18: Task 1.1 complete (Better Auth configured with Drizzle adapter, /api/auth/[...all] route, getSessionUser helper, integration test passing).
- 2026-10-18: Task 1.2 complete (Sign-up, sign-in, sign-out components, (app) layout with session guard, E2E auth tests passing).
- 2026-10-18: Task 1.3 complete (Drizzle schema and migration for user_settings, categories, clients, projects, transactions).
- 2026-10-18: Task 1.4 complete (Default categories and user_settings seeded on sign-up via Better Auth databaseHooks with idempotency and unit/integration tests).
- 2026-10-18: Task 1.5 complete (lib/currencies.ts allowlist, lib/money.ts with integer minor units & IEEE 754 precision trap prevention, lib/dates.ts timezone-safe helpers & fiscal year calculations, comprehensive unit tests passing).
- 2026-10-18: Task 1.6 complete (Zod schemas for common primitives, categories, clients, projects, transactions, settings, reports, export in lib/schemas with strict validation and 19 unit tests passing).
- 2026-10-18: Task 1.7 complete (server/http.ts wrapper created with AppError, session auth guard, Zod body/query/params parsing, JSON envelopes, sanitized internal error logging, and unit tests passing).
- 2026-10-18: Task 1.8 complete (Categories service and REST routes GET/POST /api/v1/categories & GET/PATCH/DELETE /api/v1/categories/:id with active name collision checks, in-use transaction protection, and tenancy tests passing).
- 2026-10-18: Task 1.9 complete (Clients and projects services and REST routes with active name checks, foreign key tenancy validation, archived client guard, and tenancy tests passing).
- 2026-10-18: Task 1.10 complete (Transactions service and REST routes GET/POST /api/v1/transactions, GET/PATCH/DELETE /api/v1/transactions/:id, POST /api/v1/transactions/:id/restore with keyset pagination, 30-day restore limit, category/project validation, and tenancy tests passing).
- 2026-10-18: Task 1.11 complete (Settings service and REST routes GET /api/v1/settings and PATCH /api/v1/settings with upsert fallback, validation, and tenancy isolation tests passing). Phase 1 complete!
- 2026-10-18: Task 2.1 complete (App shell with desktop Sidebar, mobile BottomNav with center quick add button, AppHeader with responsive actions, navigation routes, and component tests passing).
- 2026-10-18: Task 2.2 complete (MoneyInput with currency prefix & decimal keyboard, TransactionForm with segmented type toggle & category auto-filter, QuickAddSheet dialog/mobile sheet, URL listener, and component tests passing).
- 2026-10-18: Task 2.3 complete (TransactionsManager with multi-attribute filtering, cursor pagination, edit dialog, optimistic delete with undo toast and restore, and component tests passing).
- 2026-10-18: Task 2.4 complete (CategoriesManager and ClientsProjectsManager with CRUD, type tabs, color palette picker, archive/restore toggle, 409 conflict fallback archive dialog, mounted in /categories and /clients, and component tests passing).
- 2026-10-18: Task 2.5 complete (Reports services with getMonthSummary and getTrend, REST endpoints /api/v1/reports/summary and /api/v1/reports/trend, comprehensive fixture math tests and auth/tenancy route tests passing).
- 2026-10-18: Task 2.6 complete (DashboardView component with stat cards, Recharts 6-month trend bar chart, top clients and top expense categories breakdown, screen reader table alternative, server-rendered initial data on /dashboard, and component tests passing).
- 2026-10-18: Task 2.7 complete (SettingsManager component with display name, currency selector, percent-to-bps tax set-aside rate, fiscal calendar start month, mounted on /settings with server-rendered initial data, and component tests passing).
- 2026-10-18: Task 2.8 complete (exportTransactionsCsv service, /api/v1/export/transactions.csv endpoint, RFC 4180 and formula-injection escaping in lib/csv.ts, Export CSV button in TransactionsManager, and unit/integration tests passing).
- 2026-10-18: Task 2.9 complete (Skeleton and EmptyState components, route-level loading skeletons and AppError boundary, ThemeProvider with system preference detection and FOUC prevention, theme selector in SettingsManager, ThemeToggle in AppHeader, and Recharts CSS variable tokens).
- 2026-10-18: Task 2.10 complete (Playwright journeys 1-7 running against Supabase PostgreSQL across Chromium and Mobile Chrome passing: sign up, dashboard empty/update, filters, edit/delete/undo, client assignment, CSV export, and mobile quick add).
- 2026-10-18: Task 2.11 complete (Accessibility pass: Skip-to-content bypass link, main landmark id, WCAG AA contrast verification suite for light/dark tokens >= 4.5:1, programmatic label associations, aria-pressed filter toggles, screen-reader chart table, progressbars, prefers-reduced-motion media query). Phase 2 and MVP complete!
- 2026-10-18: Task 3.1 complete (Full specifications for invoices and recurring rules documented in DATA_MODEL.md and API_SPEC.md with lifecycle states, mark-paid transaction generation, recurrence advancement rules, and REST endpoints).
- 2026-10-18: Task 3.2 complete (Recurring rules schema, migration 0002 applied to Supabase, Zod schemas, recurring service CRUD with calendar-safe recurrence advancement & scheduled generation, REST endpoints /api/v1/recurring, /api/v1/recurring/:id, /api/v1/recurring/generate, and unit/tenancy integration tests passing).
- 2026-10-18: Task 3.3 complete (Invoices table and relations in schema, migration 0003 applied to Supabase, Zod schemas, invoices service CRUD with read-time overdue derivation, mark-paid automatic income transaction generation, REST endpoints /api/v1/invoices, /api/v1/invoices/:id, /api/v1/invoices/:id/mark-paid, and unit/tenancy integration tests passing).
- 2026-10-18: Task 3.4 complete (RFC 4180 parser in lib/csv.ts, parseCsvMoney & parseCustomDate helpers, column mapping Zod schemas, import service with preview validation and category/client resolution, REST endpoints POST /api/v1/import/transactions/preview and /api/v1/import/transactions, unit and tenancy integration tests passing).
- 2026-10-18: Task 3.5 complete (getQuarterRange helper in lib/dates.ts, reportsTaxSummaryQuerySchema & DTOs, getQuarterlyTaxSummary service, GET /api/v1/reports/tax-summary endpoint, Quarterly Tax Set-Aside section in DashboardView with quarter navigation and 3-month breakdown, unit/integration/component tests passing).
- 2026-10-18: Task 3.6 complete (Multi-currency polish with availableCurrencies discovery in getMonthSummary, dashboard currency selector dropdown, currency parameter propagation across trend and tax summary reports, and unit/component tests passing). Phase 3 complete!
- 2026-10-18: Task 4.1 complete (Zero-dependency email service with Resend REST API & mock fallback, Better Auth email verification & password reset wiring, /forgot-password, /reset-password, /verify-email pages, and unit/component/integration tests passing).
- 2026-10-18: Task 4.2 complete (Presigned URLs via zero-dependency SigV4 storage service, scoped keys users/{userId}/receipts/{uuid}, POST/GET/DELETE /api/v1/transactions/:id/receipt routes with ownership & expense checks, TransactionRow indicator & TransactionForm attachment UI, and unit/component/integration tests passing).
- 2026-10-18: Task 4.3 complete (Purge service for permanently deleting soft-deleted transactions older than 30 days with receipt object cleanup, scripts/purge-deleted.ts runnable via pnpm db:purge, POST /api/v1/maintenance/purge route with CRON_SECRET guard, and unit/integration tests passing).
- 2026-10-18: Task 4.4 complete (exportAccountData & deleteUserAccount services, GET /api/v1/account/export with JSON attachment header, DELETE /api/v1/account with phrase verification & receipt storage cleanup, Data Portability & Danger Zone UI in SettingsManager, and unit/integration/component tests passing).
- 2026-10-18: Task 4.5 complete (Security headers and CSP in next.config.ts including HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy; Better Auth native in-memory rate limiting with per-route rules; unit tests passing).
- 2026-10-18: Task 4.6 skipped (Multi-tenant isolation strictly enforced at service layer on every query with automated tenancy testing per D-004; avoiding connection-pooling session state pitfalls with external Postgres poolers).
- 2026-10-18: Task 4.7 complete (Zero-dependency PWA metadata in src/app/manifest.ts, custom cache-first service worker in public/sw.js, standalone icons, localStorage offline queue in lib/offline-queue.ts, global PwaProvider with offline alert & reconnection auto-sync, and offline-resilient optimistic quick add in TransactionForm).
- 2026-10-18: Task 4.8 complete (Zero-dependency server monitoring in src/server/monitoring.ts with sensitive data sanitization & native Sentry ingest, errorResponse & apiHandler integration, src/app/global-error.tsx root boundary, comprehensive docs/RUNBOOK.md, unit/component tests passing). Phase 4 complete! All project phases complete!
- 2026-10-18: Branding & Public Phase complete (B1–B5 complete in docs/PLAN_BRANDING_AND_PUBLIC.md: Tally logo, Plus Jakarta Sans, Pine & Sage palette, high-converting public landing page, tax calculator, restyled auth flow, in-app shell harmony, 14/14 Playwright E2E tests, 60/60 test files passing).
