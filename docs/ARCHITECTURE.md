# ARCHITECTURE

## Overview

A single Next.js app (monolith). Browser → Next.js (UI + route handlers) → service layer → Drizzle → PostgreSQL. No separate backend service.

## Folder structure

```
src/
├── app/
│   ├── (auth)/                 # sign-in, sign-up (public)
│   ├── (app)/                  # authenticated shell
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── clients/
│   │   ├── categories/
│   │   ├── settings/
│   │   └── layout.tsx          # session guard + nav
│   ├── api/
│   │   ├── auth/[...all]/      # Better Auth handler
│   │   └── v1/                 # REST route handlers (see API_SPEC.md)
│   └── layout.tsx
├── components/
│   ├── ui/                     # shadcn primitives, no business logic
│   └── features/               # transaction-form, filters-bar, charts, etc.
├── server/
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (mirrors DATA_MODEL.md)
│   │   ├── client.ts           # single db instance
│   │   └── migrations/
│   ├── services/               # business logic, one file per aggregate
│   │   ├── transactions.ts
│   │   ├── clients.ts
│   │   ├── categories.ts
│   │   ├── reports.ts
│   │   └── settings.ts
│   ├── auth.ts                 # Better Auth config + getSessionUser()
│   └── http.ts                 # route wrapper: auth, validation, errors
├── lib/
│   ├── schemas/                # Zod schemas shared by client and server
│   ├── money.ts                # parse/format/sum helpers
│   ├── dates.ts
│   └── utils.ts
├── hooks/
└── types/
tests/
├── unit/
├── integration/
└── e2e/
docs/
```

## Layers and boundaries

1. **UI (`app/`, `components/`)**: renders, collects input. Never imports from `server/db`. Server Components may call `server/services` directly.
2. **Route handlers (`app/api/v1`)**: thin. Use the `http.ts` wrapper to authenticate, parse with Zod, call one service function, shape the response. No business logic, no direct DB calls.
3. **Services (`server/services`)**: all business rules and all DB access. Every function takes `userId` as its first argument and applies it to every query.
4. **DB (`server/db`)**: schema and client only.

Allowed imports flow downward only: `app → services → db`. `lib/` is importable from anywhere and imports from nowhere above it.

## Data flow examples

**Add transaction**: form (react-hook-form + Zod) → `POST /api/v1/transactions` → wrapper validates session + body → `transactions.create(userId, input)` → insert → returns DTO → TanStack Query invalidates list and dashboard queries.

**Dashboard**: Server Component → `reports.monthSummary(userId, month)` and `reports.trend(userId, 6)` → render charts (client components receive plain props).

## Rendering strategy

- Server Components by default; add `"use client"` only for interactivity (forms, filters, charts).
- Authenticated pages are dynamic. No caching of user data across users.
- Revalidate with tags per user (`tx:${userId}`) when mutating.

## Error handling

Services throw typed `AppError` (`code`, `status`, `message`). The route wrapper maps them to the standard error envelope in `API_SPEC.md`. Unknown errors become 500 with a generic message and are logged server-side.

## Environment

Config read once in `src/server/env.ts` via Zod parse of `process.env`. Nothing else reads `process.env` directly.
