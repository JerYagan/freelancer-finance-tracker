# STACK — Allowed Technology

This file is the anti-hallucination list. If it is not here, do not use it. If you think something is missing, propose it in `DECISIONS.md` and wait.

## Version policy

Exact versions are pinned in `package.json` and the lockfile (`pnpm-lock.yaml`). The table below lists the intended major line. **At scaffold time (Plan Phase 0), the agent must run `pnpm view <pkg> version` for each package, install that exact latest-stable version, and record the resolved versions in the "Resolved versions" table at the bottom.** Do not write code against APIs from memory; check the installed package types.

## Runtime and tooling

| Concern         | Choice                                                         | Notes                                                    |
| --------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| Runtime         | Node.js LTS                                                    | Set in `.nvmrc` and `engines`                            |
| Package manager | pnpm                                                           | Only pnpm; no npm/yarn lockfiles                         |
| Language        | TypeScript, `strict: true`                                     | `noUncheckedIndexedAccess: true`                         |
| Framework       | Next.js, App Router                                            | No Pages Router                                          |
| UI library      | React (version required by Next.js)                            | Server Components by default                             |
| Styling         | Tailwind CSS                                                   | Tokens in `DESIGN_SYSTEM.md`                             |
| Components      | shadcn/ui (copied into `src/components/ui`) + Radix primitives |                                                          |
| Icons           | lucide-react                                                   |                                                          |
| Charts          | Recharts                                                       | Dashboard only                                           |
| Forms           | react-hook-form + `@hookform/resolvers`                        | Zod schemas shared with server                           |
| Validation      | Zod                                                            | Single schema per entity in `src/lib/schemas`            |
| Server state    | TanStack Query                                                 | Client components only; server components fetch directly |
| Dates           | date-fns                                                       | No moment, no dayjs                                      |
| Money           | Integer minor units + `Intl.NumberFormat`                      | No money libraries in v1                                 |

## Data and auth

| Concern                | Choice                                                                | Notes                                             |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Database               | PostgreSQL                                                            | Managed (Neon or Supabase Postgres) in production |
| ORM / migrations       | Drizzle ORM + drizzle-kit                                             | SQL migrations committed                          |
| Driver                 | `postgres` (postgres.js) or the provider's recommended Drizzle driver | One driver only                                   |
| Auth                   | Better Auth                                                           | Email + password, cookie sessions                 |
| File storage (Phase 4) | S3-compatible bucket                                                  | Presigned uploads                                 |

## Testing and quality

| Concern          | Choice                                                 |
| ---------------- | ------------------------------------------------------ |
| Unit/integration | Vitest                                                 |
| Component        | React Testing Library                                  |
| E2E              | Playwright                                             |
| Lint             | ESLint (`next/core-web-vitals`, `@typescript-eslint`)  |
| Format           | Prettier + `prettier-plugin-tailwindcss`               |
| Git hooks        | lefthook, running typecheck, lint, test on staged work |
| CI               | GitHub Actions                                         |

## Hosting

Vercel for the app, managed Postgres for data. Environment variables listed in `.env.example`.

## Explicitly NOT used

- Redux, Zustand (use React state + TanStack Query)
- Prisma, TypeORM, Sequelize, raw SQL strings in app code (Drizzle only; `sql` template for edge cases)
- NextAuth/Auth.js, Clerk, Firebase Auth (Better Auth only)
- CSS-in-JS libraries, Bootstrap, MUI, Chakra
- moment, dayjs, lodash (use native or date-fns)
- Any money library, any float math on money
- GraphQL, tRPC (REST route handlers per `API_SPEC.md`)

## Resolved versions

Filled in during Plan Phase 0.

| Package          | Version |
| ---------------- | ------- |
| node             | 24.22.0 |
| next             | 16.4.2  |
| react            | 19.3.0  |
| typescript       | 5.9.3   |
| tailwindcss      | 4.3.3   |
| drizzle-orm      | 0.45.4  |
| drizzle-kit      | 0.31.11 |
| better-auth      | 1.7.10  |
| zod              | 4.6.7   |
| vitest           | 5.0.5   |
| @playwright/test | 1.64.1  |
| date-fns         | 4.4.0   |
| recharts         | 3.10.1  |
