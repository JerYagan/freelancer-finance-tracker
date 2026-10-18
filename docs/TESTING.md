# TESTING

## Philosophy

Test behavior that would hurt users if it broke: money math, tenancy, validation, and the main flows. Do not chase coverage numbers or test framework internals.

## Layers

| Layer       | Tool                           | What it covers                                                       | Where               |
| ----------- | ------------------------------ | -------------------------------------------------------------------- | ------------------- |
| Unit        | Vitest                         | Pure functions: money, dates, report math, CSV escaping, Zod schemas | `tests/unit`        |
| Integration | Vitest + real Postgres         | Services and route handlers against a test database                  | `tests/integration` |
| Component   | Vitest + React Testing Library | Forms, filters, empty/error states                                   | beside components   |
| E2E         | Playwright                     | Critical user journeys in a browser                                  | `tests/e2e`         |

## Must-have tests (by area)

### Money and dates (unit)

- `parseMoneyInput`: "1,234.50" → 123450; rejects "12.345" for PHP/USD; rejects negatives and non-numbers.
- `formatMoney` output for PHP and USD, large values, zero.
- Tax set-aside: `floor` behavior, negative net → 0, 0 bps → 0.
- Date helpers: month boundaries, leap day, `YYYY-MM` keys, no off-by-one across time zones.

### Validation (unit)

- Every write schema: valid case, each required field missing, boundary lengths, unknown keys rejected.

### Services (integration)

- Create/update/soft-delete/restore transaction.
- Category type must match transaction type (`RULE_VIOLATION`).
- Referenced category/client/project belonging to another user is rejected.
- Archived category cannot be used for new transactions.
- Delete of an in-use category/client returns `CONFLICT`.
- Reports: monthly summary and trend match a hand-computed fixture; soft-deleted rows excluded; zero-filled months.
- Pagination: stable ordering and cursor continuity with duplicate dates.

### Tenancy (integration, required for every endpoint)

For each resource: user B gets `404` on GET, PATCH, DELETE of user A's record; list endpoints never include A's rows; reports never include A's totals.

### Auth (integration)

- Unauthenticated requests to `/api/v1/*` return `401`.
- Sign-up seeds default categories and settings.

### E2E (Playwright)

1. Sign up → lands on empty dashboard.
2. Add an income and an expense → dashboard totals update.
3. Filter transactions by type and date range.
4. Edit and delete a transaction, undo the delete.
5. Create a client, assign a transaction, see client in top clients.
6. Export CSV and check the header row.
7. Mobile viewport (375px): quick add via bottom bar.

## Conventions

- Arrange / Act / Assert, one behavior per test, descriptive names: `rejects expense with income category`.
- Use factories in `tests/factories` (`makeUser`, `makeTransaction`). No shared mutable fixtures.
- Integration tests run against a dedicated database (`DATABASE_URL` pointing to `*_test`), migrated once, each test wrapped in a transaction rollback or truncated between tests.
- Time-dependent code takes a `now` argument or uses fake timers; never rely on the real clock.
- No network calls to third parties; mock at the boundary.
- Do not snapshot-test large UI trees.

## Commands

```bash
pnpm test            # unit + integration + component
pnpm test:e2e        # Playwright (starts dev server)
pnpm test -- --watch
```

## CI

GitHub Actions on every PR: install, typecheck, lint, `pnpm test`, build; E2E on `main` and release branches. A failing check blocks merge.

## Rules for agents

- Write or update tests in the same change as the code.
- Never delete or weaken a test to get green. If a test is wrong, explain why and fix it.
- Bug fixes start with a failing test that reproduces the bug.
