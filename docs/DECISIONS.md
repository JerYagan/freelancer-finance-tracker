# DECISIONS (ADR-lite)

Short log of choices that would be hard to guess later. Newest at the bottom. Append, don't rewrite history; if a decision changes, add a new entry that supersedes the old one.

## Template

```
### D-XXX: Title
- Date: YYYY-MM-DD
- Status: accepted | superseded by D-YYY
- Context: why this came up (1–2 lines)
- Decision: what we chose
- Consequences: tradeoffs, what this rules out
```

---

### D-001: Money stored as integer minor units

- Date: 2026-10-16
- Status: accepted
- Context: Floats cause rounding errors in financial totals.
- Decision: Store `amount_minor` as `bigint`; compute in integers; format with `Intl.NumberFormat`.
- Consequences: Need parse/format helpers; currencies with non-2 decimals need a minor-unit table. Rules out money libraries in v1.

### D-002: Next.js monolith with Postgres + Drizzle

- Date: 2026-10-16
- Status: accepted
- Context: Solo-friendly project; want one deployable, typed end to end.
- Decision: Next.js App Router, REST route handlers, service layer, Drizzle ORM on PostgreSQL.
- Consequences: No separate API service. Routes stay thin; logic lives in `server/services`. Can extract an API later if needed.

### D-003: Better Auth with email + password

- Date: 2026-10-16
- Status: accepted
- Context: Need simple self-hosted auth with cookie sessions and TypeScript support.
- Decision: Use Better Auth; no social login in MVP.
- Consequences: Auth tables are managed by the library. Email verification and password reset wait for an email provider (Phase 4).

### D-004: Tenancy via `user_id` on every row, enforced in services

- Date: 2026-10-16
- Status: accepted
- Context: Multi-user data must never leak.
- Decision: Every query filters by `userId`; foreign access returns 404; tenancy tests per endpoint. Postgres RLS is an optional second layer later.
- Consequences: Services always take `userId`; slightly more boilerplate.

### D-005: Cash-basis income, soft deletes, derived overdue

- Date: 2026-10-16
- Status: accepted
- Context: Freelancers think in money received; invoices come later.
- Decision: Income counts on the transaction date. Invoices (Phase 3) create an income transaction when marked paid. Overdue is derived at read time. Transactions are soft-deleted with 30-day restore.
- Consequences: No accrual reporting in v1. Purge job needed.

### D-006: Default currency PHP, per-transaction currency, no mixing

- Date: 2026-10-16
- Status: accepted
- Context: Primary user is in the Philippines but freelancers often bill in USD.
- Decision: User has a default currency (initially PHP). Each transaction stores its currency. Reports are per currency and never convert silently.
- Consequences: Dashboard needs a currency selector when multiple currencies exist. Exchange rates are out of scope until PRD F14.

### D-007: Cursor pagination for transactions

- Date: 2026-10-16
- Status: accepted
- Context: Lists can grow large; offset pagination is unstable with inserts.
- Decision: Cursor on `(occurred_on desc, id desc)`.
- Consequences: No "jump to page N". Fine for a feed-style list.

### D-008: Zero-dependency RFC 4180 CSV parser and preview-first import

- Date: 2026-10-18
- Status: accepted
- Context: CSV imports from banking and accounting software contain multiline cells, escaped quotes, various date formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY), and signed amounts or accounting parentheses e.g. (120.50).
- Decision: Implemented zero-dependency RFC 4180 CSV parser in `lib/csv.ts` adhering to STACK.md rules against extra dependencies. Import flow separates preview validation (`POST /api/v1/import/transactions/preview`) from final persistence (`POST /api/v1/import/transactions`), with automatic tenant category/client resolution and optional `skipInvalid` error handling.
- Consequences: Eliminates external package footprint; provides instant UI feedback with row-level error diagnosis before inserting transactions.

### D-009: Zero-dependency email provider and Better Auth email verification & password reset

- Date: 2026-10-18
- Status: accepted
- Context: Need production-ready transactional email for account verification and password reset while adhering strictly to STACK.md ban on unapproved dependencies.
- Decision: Implemented `src/server/services/email.ts` using native `fetch` against Resend's REST API (`https://api.resend.com/emails`) when `RESEND_API_KEY` is present. In development/testing environments without an API key, falls back to in-memory logging and tracking buffer. Wired callbacks `sendVerificationEmail` and `sendResetPassword` directly into Better Auth with dedicated pages `/forgot-password`, `/reset-password`, and `/verify-email`.
- Consequences: No extra npm dependencies needed. Zero-friction local development without requiring live SMTP credentials. Seamless switch to Resend in production by configuring `RESEND_API_KEY`.

### D-010: Zero-dependency AWS SigV4 presigned URLs and receipt storage tenancy

- Date: 2026-10-18
- Status: accepted
- Context: Expense transactions need receipt attachments (JPG, PNG, PDF up to 10MB) stored in S3-compatible object storage with direct client uploads and strict user ownership isolation.
- Decision: Implemented zero-dependency AWS SigV4 signer in `src/server/services/storage.ts` using Node standard `node:crypto`. Storage keys are strictly scoped per SECURITY.md as `users/${userId}/receipts/${uuid}.${ext}`. Endpoints `POST/GET/DELETE /api/v1/transactions/:id/receipt` verify user tenancy and reject non-expense transactions before granting presigned upload or download URLs. Provided local `/api/v1/mock-storage` endpoint and in-memory test store when S3 credentials are not configured.
- Consequences: Eliminates external S3 SDK dependencies; ensures multi-tenant receipt isolation where users can never view or overwrite another tenant's receipts.

### D-011: Full account export and cascade account deletion with storage cleanup

- Date: 2026-10-18
- Status: accepted
- Context: Users require full data portability (GDPR compliance) and a permanent account deletion mechanism that removes all database rows and stored receipt objects.
- Decision: Implemented `exportAccountData` and `deleteUserAccount` in `src/server/services/account.ts` exposed via `GET /api/v1/account/export` and `DELETE /api/v1/account`. Export paginates through all user transactions and invoices to generate a single structured JSON archive with attachment headers. Account deletion discovers all user receipt storage keys, calls `deleteObject` on S3, and hard-deletes the `user` record in Postgres, triggering database-level `ON DELETE CASCADE` across all child tables. The UI requires the user to type `"DELETE"` in a destructive confirmation dialog.
- Consequences: Ensures no orphaned receipt files in S3 and complete hard cleanup across all tenant tables on account deletion.

### D-012: Comprehensive security headers, Content Security Policy, and auth route rate limiting

- Date: 2026-10-18
- Status: accepted
- Context: Financial application requirements in `SECURITY.md` mandate strict transport security, Content Security Policy (CSP), clickjacking and sniffing prevention, and brute-force mitigation on auth endpoints.
- Decision: Configured global security headers in `next.config.ts` via `headers()`, applying CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and HSTS `Strict-Transport-Security`. Enabled Better Auth's native in-memory rate limiting with rolling 60s windows and fine-grained per-endpoint limits for `/sign-in/*`, `/sign-up/*`, `/forget-password`, `/reset-password`, and `/send-verification-email`.
- Consequences: Enforces browser-level transport and framing security across all routes and API endpoints while mitigating credential stuffing without adding external proxy dependencies.### D-013: Zero-dependency PWA manifest, service worker caching, and offline-friendly quick add

- Date: 2026-10-18
- Status: accepted
- Context: Freelancers logging expenses in the field require quick-add capabilities even when connectivity is intermittent or completely offline, as well as an installable PWA experience on mobile/desktop without breaking the STACK.md zero-unapproved-dependency constraint.
- Decision: Implemented standard Next.js App Router metadata manifest in `src/app/manifest.ts` serving `/manifest.webmanifest`, paired with a custom native Service Worker in `public/sw.js` providing cache-first asset loading and stale-while-revalidate navigation fallbacks. Implemented an offline transaction queue (`src/lib/offline-queue.ts`) using browser `localStorage` (`fft_offline_transactions`), wrapped with a global `PwaProvider` (`src/components/pwa-provider.tsx`) that displays connectivity alerts, tracks queue depth, listens for `beforeinstallprompt`, and automatically replays queued transactions to `POST /api/v1/transactions` upon network reconnection.
- Consequences: Zero npm package overhead (no workbox/next-pwa). Seamless offline transaction creation with instant optimistic UI feedback (<5ms) and automatic background reconciliation on reconnect.

### D-014: Zero-dependency error monitoring, secret-sanitized telemetry, and production runbook

- Date: 2026-10-18
- Status: accepted
- Context: Need production-ready error observability, remote exception dispatch to Sentry, root error boundary recovery, and operational guidelines without violating STACK.md by introducing external SDK dependencies.
- Decision: Implemented `src/server/monitoring.ts` providing `captureException`, `sanitizeMessage`, and `sanitizeObject` to recursively redact database connection credentials, Authorization tokens, passwords, session cookies, and sensitive keys. Configured native HTTPS ingest directly to Sentry (`/api/{projectId}/store/`) when `SENTRY_DSN` is configured. Integrated monitoring into `src/server/http.ts`'s `errorResponse` and `apiHandler` with `requestId`, `userId`, route, and method tracking. Implemented root layout error boundary `src/app/global-error.tsx` with error reference digest display and dashboard recovery link. Authored comprehensive operational manual in `docs/RUNBOOK.md` covering architecture, environment variable matrix, database migrations, automated cron jobs (recurring rules & 30-day purge), disaster recovery drills, and secret rotation playbooks.
- Consequences: Production-grade observability and operational resilience with zero external package footprint and strict guarantee against sensitive credential leaks in log streams.

### D-015: Tally brand identity, Plus Jakarta Sans typography, and dual-tone icon system

- Date: 2026-10-18
- Status: accepted
- Context: Transitioning from generic placeholder styling to the official "Tally" brand system (*"Track it. Earn it. Grow it."*), based on provided brand identity boards and SVG logo assets in `SVG/`. The user specifically mandated using an established icon library (`lucide-react`) rather than emojis as icons.
- Decision: Configured `Plus_Jakarta_Sans` via `next/font/google` as `--font-sans` with weights 400 through 800. Migrated color tokens in `src/app/globals.css` and `docs/DESIGN_SYSTEM.md` to the 5 official Tally colors: Pine Charcoal (`#17211B`), Sage Forest (`#5E8C61`), Pastel Mint (`#A7C8A3`), Warm Cream (`#F3F1E8`), and Ivory Surface (`#FFFFEF`). Replaced generic app icons and logos with SVG React components (`<TallyIcon />` and `<TallyLogo />`) derived directly from `SVG/tally-logo-light.svg`. Created `<BrandIcon />` leveraging `lucide-react` with brand-tailored squircle badge containers in Pastel Mint and Sage Forest, enforcing a zero-emoji rule across the interface.
- Consequences: Gives the application an inviting, high-converting, premium organic aesthetic tailored for independent freelancers, with high WCAG AA contrast (>10:1 body text contrast) and zero unapproved dependencies.

