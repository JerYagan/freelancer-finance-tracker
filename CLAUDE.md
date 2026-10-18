# AGENTS.md

Master rules for any AI coding agent working in this repo. `CLAUDE.md` is a symlink or copy of this file; keep them identical.

## Project in one line

A multi-user income and expense tracker for freelancers: log money in and out, tie it to clients and projects, see monthly profit, and set aside money for taxes.

## Read first, in this order

1. `docs/PRD.md` — what we are building and what we are not
2. `docs/STACK.md` — the only allowed technologies and versions
3. `docs/ARCHITECTURE.md` — where code lives and how data flows
4. `docs/DATA_MODEL.md` — the database source of truth
5. `docs/PLAN.md` — the current phase and the next unchecked task

Read the others when the task touches them: `API_SPEC.md`, `CONVENTIONS.md`, `DESIGN_SYSTEM.md`, `SECURITY.md`, `TESTING.md`, `DECISIONS.md`.

## Working loop

1. Open `docs/PLAN.md`, take the first unchecked task of the current phase. Do one task at a time.
2. If the task is ambiguous or conflicts with a doc, stop and ask. Do not guess.
3. Implement, write or update tests (see `docs/TESTING.md`), run the checks below.
4. Tick the task in `docs/PLAN.md` only when checks pass. Add a one-line note if something changed.
5. If you made a lasting choice (library, pattern, tradeoff), append an entry to `docs/DECISIONS.md`.

## Hard rules

- **Do not add dependencies** that are not in `docs/STACK.md`. If one is needed, propose it and wait for approval.
- **Do not invent APIs.** If you are unsure a function, option or flag exists in the pinned version, check the installed package's types or docs before using it.
- **Schema changes** go through `docs/DATA_MODEL.md` first, then a Drizzle migration. Never edit the database by hand and never edit an applied migration.
- **Money is integer minor units** (centavos, cents). Never use floats for money. See `docs/CONVENTIONS.md`.
- **Every query is scoped by `user_id`.** No exceptions. See `docs/SECURITY.md`.
- **Validate all input with Zod at the boundary.** Never trust the client.
- **Never read, print, log or commit secrets.** Only `.env.example` is committed.
- **Stay in scope.** Do not refactor unrelated code or add features not in `docs/PRD.md`.
- **No placeholder code** such as `// TODO implement` presented as done. Either finish it or say what is missing.

## Commands

Run before saying a task is done:

```bash
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest run
pnpm build         # only for tasks touching routing, config or deployment
```

Other: `pnpm dev`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm test:e2e`.

## Definition of done

- Behavior matches `docs/PRD.md` and `docs/API_SPEC.md`
- Types, lint and tests pass
- New logic has tests; new endpoints have an auth/tenancy test
- Docs updated if behavior, schema or API changed
- `docs/PLAN.md` ticked

## When unsure

Ask one specific question with your recommended default. Prefer a short question over a large wrong change.
