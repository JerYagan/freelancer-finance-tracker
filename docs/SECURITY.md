# SECURITY

Financial data is sensitive. These rules are non-negotiable.

## Threat model (short)

- Another logged-in user trying to read or change someone else's data (tenancy)
- Credential stuffing and brute force on login
- Injection and malformed input
- Secret leakage via repo, logs or client bundle
- Data loss from bad deletes or migrations

## Authentication

- Better Auth, email + password, cookie sessions (`HttpOnly`, `Secure` in production, `SameSite=Lax`).
- Passwords: minimum 10 characters; hashing handled by Better Auth. Never implement custom hashing.
- Email verification required before first sign-in once an email provider is configured (Phase 4); until then documented as a known gap.
- Sign-out invalidates the server session.
- Rate-limit sign-in, sign-up and password reset endpoints.

## Authorization and tenancy

- Single-tenant-per-user model: every user-owned row has `user_id`.
- `getSessionUser()` in `src/server/auth.ts` is the only way to obtain the current user. Route handlers and server components call it; services receive `userId` as an argument.
- **Every** service query filters by `userId`. For writes that reference other rows (category, client, project), verify those rows belong to the same user before inserting.
- Foreign resource access returns `404`, never `403`.
- Add a tenancy test for each new endpoint (user B cannot read, update or delete user A's record).
- Optional hardening (Phase 4): Postgres Row Level Security with `user_id = current_setting('app.user_id')` as a second layer.

## Input validation

- Zod at every boundary: route handlers (body, query, params) and forms.
- Reject unknown keys (`.strict()`) on write schemas.
- Limits: description ≤ 280, notes ≤ 2000, names ≤ 120, amount between 1 and 10^12 minor units.
- Currency must be a known ISO 4217 code from an allowlist in `src/lib/currencies.ts`.
- Use Drizzle's parameterized queries only. No string-built SQL.

## Output and XSS

- React escapes by default. Never use `dangerouslySetInnerHTML` with user content.
- CSV export: prefix cells starting with `=`, `+`, `-`, `@` with `'` to prevent spreadsheet formula injection.

## Secrets and config

- Secrets only in environment variables. `.env.example` is committed with empty values; `.env*` otherwise is git-ignored.
- Only variables prefixed `NEXT_PUBLIC_` reach the browser. Never put a secret there.
- Parse env once in `src/server/env.ts`; fail fast on missing values.
- Never log secrets, session tokens, passwords, full request bodies or amounts.
- Rotate `BETTER_AUTH_SECRET` if exposed; this invalidates sessions.

## Transport and headers

- HTTPS only in production (HSTS).
- Set via Next.js config/middleware: `Content-Security-Policy` (self + required assets), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- CSRF: state-changing routes require `Content-Type: application/json` and rely on `SameSite=Lax` cookies plus Better Auth's origin checks. Do not accept state changes via GET.

## File uploads (Phase 4)

- Presigned upload URLs scoped to `users/{userId}/receipts/{uuid}`.
- Allow `image/jpeg`, `image/png`, `application/pdf` only, max 10 MB. Validate on the server before issuing the URL.
- Bucket is private; downloads via short-lived presigned URLs after an ownership check.

## Data protection

- Soft delete with 30-day restore, then purge job.
- Backups: managed Postgres point-in-time recovery enabled in production.
- User data export (CSV) and account deletion (hard delete of all rows via cascade) available from settings in Phase 4.
- Collect the minimum: email, optional display name, financial entries. No analytics on transaction content.

## Dependencies

- Run `pnpm audit` in CI; fail on high severity.
- Pin versions via lockfile; review changelogs for auth and DB packages before upgrading.

## Agent rules

- Do not weaken any rule here to make a test pass.
- If a task seems to require bypassing tenancy or validation, stop and ask.
