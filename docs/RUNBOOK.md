# Production Runbook

Operational guide for deploying, maintaining, monitoring, and operating the Freelancer Finance Tracker in production.

---

## 1. System Architecture

The application is deployed as a single Next.js monolith communicating with managed PostgreSQL, S3-compatible object storage, and transactional email infrastructure:

```
                  ┌────────────────────────────────────────┐
                  │          Vercel / Node Runtime         │
                  │                                        │
                  │  Next.js App Router (React 19 + PWA)   │
                  │  ├── Server Components & Client UI    │
                  │  ├── Route Handlers (/api/v1/*)        │
                  │  └── Service Layer (Business Logic)    │
                  └──────┬────────────┬────────────┬───────┘
                         │            │            │
            Drizzle ORM  │   SigV4    │    REST    │  HTTPS Ingest
                         ▼            ▼            ▼
                 ┌────────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
                 │ PostgreSQL │ │ S3 Bucket │ │  Resend   │ │  Sentry   │
                 │ (Neon /    │ │ (Receipts)│ │  (Email)  │ │ (Errors)  │
                 │  Supabase) │ │           │ │           │ │           │
                 └────────────┘ └───────────┘ └───────────┘ └───────────┘
```

- **Runtime**: Node.js LTS (>= 20) / Next.js 16 App Router on Vercel or containerized Node environment.
- **Database**: Managed PostgreSQL (Supabase or Neon) with connection pooling for runtime traffic and direct connection for migrations.
- **Tenancy**: Single-tenant-per-user model. Every query is scoped by `user_id` at the service layer (`D-004`).
- **Storage**: S3-compatible object storage for expense receipts with strict tenant key scoping `users/{userId}/receipts/{uuid}.{ext}`.
- **Email**: Resend REST API for account verification and password reset emails.

---

## 2. Environment Variables

All configuration is parsed once at startup in `src/server/env.ts` with strict Zod validation. The application will refuse to start if required variables are missing or malformed.

| Variable                     |  Required?  | Purpose                                                    | Example / Generation                                              |
| :--------------------------- | :---------: | :--------------------------------------------------------- | :---------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`        |   **Yes**   | Canonical public base URL                                  | `https://finance.yourdomain.com`                                  |
| `NODE_ENV`                   |   **Yes**   | Node environment                                           | `production`                                                      |
| `DATABASE_URL`               |   **Yes**   | Pooled PostgreSQL connection string for runtime queries    | `postgresql://user:pass@pooler.neon.tech:5432/db?sslmode=require` |
| `DATABASE_URL_UNPOOLED`      | Recommended | Direct PostgreSQL connection string for Drizzle migrations | `postgresql://user:pass@direct.neon.tech:5432/db?sslmode=require` |
| `BETTER_AUTH_SECRET`         |   **Yes**   | 32-byte secret used for session signing and hashing        | Generate: `openssl rand -base64 32`                               |
| `BETTER_AUTH_URL`            |   **Yes**   | Base URL for auth callbacks                                | `https://finance.yourdomain.com`                                  |
| `DEFAULT_CURRENCY`           |     No      | Default currency ISO 4217 code for new users               | `PHP` (default) or `USD`                                          |
| `RESEND_API_KEY`             | Production  | API key for transactional email delivery                   | `re_abc123...`                                                    |
| `EMAIL_FROM`                 | Production  | Sender identity for auth emails                            | `Freelancer Finance <noreply@yourdomain.com>`                     |
| `REQUIRE_EMAIL_VERIFICATION` | Production  | Enforce email verification before sign in                  | `true`                                                            |
| `STORAGE_BUCKET`             |  Optional   | S3 bucket name for receipt uploads                         | `freelancer-receipts-prod`                                        |
| `STORAGE_ACCESS_KEY_ID`      |  Optional   | AWS IAM / S3 access key ID                                 | `AKIA...`                                                         |
| `STORAGE_SECRET_ACCESS_KEY`  |  Optional   | AWS IAM / S3 secret access key                             | Secret string                                                     |
| `STORAGE_ENDPOINT`           |  Optional   | Custom S3 endpoint (for Cloudflare R2, MinIO, etc.)        | `https://<account-id>.r2.cloudflarestorage.com`                   |
| `CRON_SECRET`                | Production  | Secret token guarding maintenance endpoints                | Generate: `openssl rand -hex 24`                                  |
| `SENTRY_DSN`                 |  Optional   | Error monitoring DSN for server-side telemetry             | `https://key@o123456.ingest.sentry.io/7891011`                    |

---

## 3. Database Operations & Migrations

### 3.1 Migration Workflow

1. **Local Schema Changes**:
   - Update `docs/DATA_MODEL.md` first.
   - Modify `src/server/db/schema.ts`.
   - Run `pnpm db:generate` to produce a new numbered migration file in `src/server/db/migrations/`.
   - Test locally with `pnpm db:migrate`.

2. **Applying Migrations in Production**:
   - Always run migrations using the **direct/unpooled connection** (`DATABASE_URL_UNPOOLED`):
     ```bash
     pnpm db:migrate
     ```
   - Migrations are transactional and safe to run during deployment. Run `pnpm db:migrate` in the build step or release phase prior to swapping traffic to the new build.

### 3.2 Backups and Recovery

- **Managed PITR**: Ensure Point-in-Time Recovery (PITR) is enabled on Supabase or Neon with at least 7–30 days retention.
- **Logical Dump Backup**:
  ```bash
  pg_dump "$DATABASE_URL_UNPOOLED" --format=custom --no-owner --file="fft_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```
- **Disaster Recovery Drill**:
  1. Restore dump to a staging database:
     ```bash
     pg_restore --clean --no-owner -d "$STAGING_DATABASE_URL" fft_backup_YYYYMMDD_HHMMSS.dump
     ```
  2. Verify row counts and integrity:
     ```sql
     SELECT COUNT(*) FROM "user";
     SELECT COUNT(*) FROM "transactions";
     SELECT COUNT(*) FROM "invoices";
     ```

---

## 4. Automated Maintenance & Scheduled Jobs

Two scheduled maintenance jobs must be configured in production using either Vercel Cron, GitHub Actions, or an external scheduler.

### 4.1 Recurring Transaction Generator

- **Endpoint**: `POST /api/v1/recurring/generate`
- **Authentication**: `Authorization: Bearer <CRON_SECRET>`
- **Schedule**: Daily at `00:05 UTC` (`cron: 5 0 * * *`)
- **Behavior**: Scans active recurring rules across all users where `next_due_date <= TODAY`, creates pending/active transactions, and advances the rule's `next_due_date` according to its interval (`monthly`, `weekly`, `yearly`).
- **Example cURL**:
  ```bash
  curl -X POST "https://finance.yourdomain.com/api/v1/recurring/generate" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

### 4.2 Soft-Deleted Data Purge Job

- **Endpoint**: `POST /api/v1/maintenance/purge`
- **CLI Alternative**: `pnpm db:purge` (runs `scripts/purge-deleted.ts`)
- **Authentication**: `Authorization: Bearer <CRON_SECRET>`
- **Schedule**: Weekly on Sunday at `02:00 UTC` (`cron: 0 2 * * 0`)
- **Behavior**: Permanently deletes transactions soft-deleted more than 30 days ago (`deleted_at < NOW() - 30 days`). Discovers and deletes associated receipt files from S3 storage to avoid orphaned storage costs.
- **Example cURL**:
  ```bash
  curl -X POST "https://finance.yourdomain.com/api/v1/maintenance/purge" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```

### 4.3 Vercel Cron Configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/v1/recurring/generate",
      "schedule": "5 0 * * *"
    },
    {
      "path": "/api/v1/maintenance/purge",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

_Note: In Vercel, requests from Vercel Cron automatically include the header `Authorization: Bearer <CRON_SECRET>` if configured under Environment Variables._

---

## 5. Observability, Monitoring & Incident Response

### 5.1 Error Monitoring Architecture

- **Server-Side Monitoring**: `src/server/monitoring.ts` captures unhandled exceptions in route handlers, sanitizes credentials/tokens, and dispatches structured event payloads to Sentry when `SENTRY_DSN` is configured.
- **Sanitization Guarantee**: The monitoring pipeline automatically redacts database connection credentials (`[REDACTED_CREDENTIALS]`), Authorization headers (`Bearer [REDACTED]`), session cookies, and sensitive object keys (`password`, `secret`, `token`, `key`).
- **Error Boundaries**:
  - `src/app/global-error.tsx`: Catches fatal errors in the root layout and renders a branded recovery UI with an error reference digest.
  - `src/app/(app)/error.tsx`: Catches page-level errors inside the authenticated shell, allowing users to retry or return to the dashboard.

### 5.2 Incident Triage Playbook

When an alert fires or a user reports an issue, inspect logs using the unique `requestId` emitted in error responses:

| HTTP Status | Error Code        | Common Cause                                                         | Action / Resolution                                                                                  |
| :---------: | :---------------- | :------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
|   **401**   | `UNAUTHENTICATED` | Session expired or missing cookie                                    | Instruct user to sign in again. Verify `BETTER_AUTH_URL` matches host.                               |
|   **404**   | `NOT_FOUND`       | Resource deleted, invalid ID, or cross-tenant access attempt         | Normal behavior for unauthorized or missing rows (anti-enumeration).                                 |
|   **409**   | `CONFLICT`        | Category name collision or attempt to delete in-use category         | Advise user to archive instead of deleting.                                                          |
|   **422**   | `RULE_VIOLATION`  | Category type mismatch (e.g. expense category on income transaction) | Check client form validation state.                                                                  |
|   **429**   | `RATE_LIMITED`    | Auth brute-force rate limit hit (e.g. >5 sign-in attempts per min)   | User must wait 60 seconds. In extreme cases, check for IP-level attack.                              |
|   **500**   | `INTERNAL`        | Unhandled database error or unexpected crash                         | Search logs for `[Internal Server Error] [requestId: <id>]`. Verify database connection pool health. |

### 5.3 Health Check & Status Verification

To verify that the deployment is healthy and responding:

```bash
curl -I https://finance.yourdomain.com/sign-in
```

Ensure HTTP `200 OK` is returned and security headers are present (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`).

---

## 6. Security & Secret Rotation Playbooks

### 6.1 Rotating `BETTER_AUTH_SECRET`

- **Impact**: All active user sessions are invalidated immediately. Users will be logged out and required to sign in again.
- **Procedure**:
  1. Generate new secret: `openssl rand -base64 32`
  2. Update `BETTER_AUTH_SECRET` in hosting provider dashboard.
  3. Redeploy the application.

### 6.2 Rotating `DATABASE_URL`

- **Procedure**:
  1. Create a new password or pooler role in Supabase / Neon.
  2. Update `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in hosting provider.
  3. Trigger zero-downtime redeploy.
  4. Once all connections drain to the new pooler role, drop the previous database credentials.

### 6.3 Rotating `CRON_SECRET`

- **Procedure**:
  1. Generate new secret: `openssl rand -hex 24`
  2. Update `CRON_SECRET` in hosting provider and in cron runner configurations.
  3. Redeploy.

### 6.4 User Data Deletion & GDPR Compliance

- Users can self-delete their entire account under **Settings > Danger Zone**.
- To manually audit or confirm deletion:
  ```sql
  SELECT id, email FROM "user" WHERE id = '<target_user_id>';
  ```
  Deleting the user row cascades automatically to `user_settings`, `categories`, `clients`, `projects`, `transactions`, `recurring_rules`, and `invoices`. The application's account deletion service also deletes all S3 receipt objects under `users/<target_user_id>/receipts/`.

---

## 7. Pre-Deployment Quality Gates

Before any deployment to production, the continuous integration pipeline must pass all four quality gates:

```bash
pnpm typecheck     # TypeScript strict compilation (tsc --noEmit)
pnpm lint          # ESLint with Next.js core web vitals
pnpm test          # Vitest full suite (unit, component, and tenancy integration tests)
pnpm build         # Next.js production build and page optimization
```
