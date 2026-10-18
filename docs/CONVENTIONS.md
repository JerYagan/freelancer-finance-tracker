# CONVENTIONS

## TypeScript

- `strict`, no `any` (use `unknown` and narrow). No non-null `!` without a comment explaining why.
- Prefer `type` for data shapes, `interface` only for extendable contracts.
- Derive types from Zod: `type TransactionInput = z.infer<typeof transactionInputSchema>`.
- Named exports only, except Next.js files that require default exports (`page.tsx`, `layout.tsx`, `route.ts` handlers are named).
- No barrel files (`index.ts` re-exports) outside `components/ui`.

## Naming

| Thing                | Style                                    | Example                  |
| -------------------- | ---------------------------------------- | ------------------------ |
| Files (components)   | kebab-case                               | `transaction-form.tsx`   |
| Components           | PascalCase                               | `TransactionForm`        |
| Functions, variables | camelCase                                | `createTransaction`      |
| Constants            | UPPER_SNAKE_CASE                         | `MAX_PAGE_SIZE`          |
| DB tables, columns   | snake_case                               | `occurred_on`            |
| API JSON fields      | camelCase                                | `occurredOn`             |
| Zod schemas          | camelCase + `Schema`                     | `transactionInputSchema` |
| Hooks                | `use` prefix                             | `useTransactions`        |
| Tests                | `*.test.ts(x)` next to or under `tests/` |                          |

Mapping between snake_case rows and camelCase DTOs happens in services via explicit mapper functions.

## Money (critical)

- Store and compute in integer minor units. Helpers in `src/lib/money.ts`:
  - `parseMoneyInput(string, currency) → bigint-safe integer` (rejects more decimals than the currency allows)
  - `formatMoney(minor, currency, locale?) → string` using `Intl.NumberFormat`
  - `sumMinor(values)`
- Use `number` for minor units in app code (safe up to 2^53) and `bigint` only in the DB column mapping. Reject values above `Number.MAX_SAFE_INTEGER`.
- Never `parseFloat` user money and multiply. Never round with `toFixed` for storage.
- Tax set-aside uses integer math: `Math.floor(net * bps / 10000)`.
- Never add or compare amounts of different currencies.

## Dates

- `occurred_on` is a `YYYY-MM-DD` string end to end; do not convert through `Date` in a way that shifts days. Use date-fns `parseISO`/`format` with local date parts, or string operations.
- "Today" is computed in the user's browser time zone on the client and passed to the server when it matters.
- Month keys are `YYYY-MM`.

## React / Next.js

- Server Components by default. `"use client"` goes in the smallest leaf component that needs it.
- No data fetching in `useEffect`; use server components or TanStack Query.
- Forms: react-hook-form + `zodResolver`, same schema as the API.
- Colocate a component's tiny helpers; move to `lib/` only when shared.
- Every list has loading, empty and error states.
- Accessibility: labelled inputs, visible focus, keyboard-operable dialogs, `aria-live` for toasts.

## Services and routes

- One exported function per use case: `create`, `update`, `list`, `getById`, `softDelete`, `restore`.
- Signature: `(userId: string, ...args)`. Never read the user from a global inside a service.
- Throw `AppError` with a code; never return `null` to signal an error, never throw plain strings.
- Route handlers contain no business logic (see `ARCHITECTURE.md`).

## Database

- Queries through Drizzle only. Always include `eq(table.userId, userId)`.
- Wrap multi-step writes in `db.transaction`.
- Select explicit columns for list endpoints.

## Error handling and logging

- Validate at the boundary, trust types inside.
- Log server errors with a request id; never log request bodies, emails or amounts.
- User-facing messages are plain and actionable. No stack traces to the client.

## Comments and docs

- Comment the why, not the what. Public service functions get a one-line doc comment.
- Update docs in the same change when behavior, schema or API changes.

## Git

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Small commits, one task from `PLAN.md` per commit when possible.
- Branches: `feat/<short-name>`, `fix/<short-name>`.

## Imports order

1. Node/builtins, 2. external packages, 3. `@/` aliases, 4. relative. Enforced by ESLint/Prettier. Alias `@/*` → `src/*`.
