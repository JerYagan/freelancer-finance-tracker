# PRD — Freelancer Finance Tracker

## Problem

Freelancers mix client payments, tools, taxes and personal spending across bank apps and spreadsheets. They cannot quickly answer: how much did I earn this month, who still owes me, what am I spending on, and how much should I set aside for taxes.

## Target user

Solo freelancers (designers, developers, writers, consultants) with a handful to a few dozen clients. Not accountants, not agencies with staff.

## Goals

1. Log an income or expense in under 10 seconds.
2. Show monthly income, expenses and net at a glance.
3. Tie money to clients and projects to see which ones are worth it.
4. Estimate a tax set-aside so there are no surprises.
5. Work well on mobile browsers.

## Non-goals (v1)

- Bank syncing or open banking
- Full double-entry accounting, payroll, multi-user teams
- Invoice PDF generation and payment collection (tracked as simple records only, see Phase 3)
- Official tax filing or tax advice. Estimates are informational.

## Core concepts

- **Transaction**: one income or expense with amount, date, category, optional client/project.
- **Client**: who pays you. **Project**: optional grouping under a client.
- **Category**: user-editable labels, separate lists for income and expense.
- **Invoice** (Phase 3): a billed amount with status (draft, sent, paid, overdue) that can generate an income transaction when paid.
- **Tax set-aside**: a percentage of net income the user chooses to reserve.

## Functional requirements

### Must (MVP)

- F1. Email + password sign up, sign in, sign out
- F2. Create, edit, soft-delete transactions (income/expense)
- F3. Manage categories (seeded defaults, user can add/rename/archive)
- F4. Manage clients and projects
- F5. Transaction list with filters: date range, type, category, client, project, text search; sorted by date desc; paginated
- F6. Dashboard: current month income, expenses, net; 6-month trend; top clients; top expense categories
- F7. Settings: display name, default currency, tax set-aside percent, fiscal-year start month
- F8. CSV export of transactions for a date range

### Should

- F9. Recurring transactions (monthly subscriptions, retainers)
- F10. CSV import with column mapping
- F11. Receipt attachment (image/PDF) per expense
- F12. Quarterly tax set-aside summary

### Could

- F13. Invoice records with status and overdue highlight
- F14. Multi-currency with manual exchange rate on the transaction
- F15. PWA install and offline-friendly quick add

## Rules

- Amounts are positive; the type (income/expense) gives the sign.
- A transaction's date is a calendar date (no time zone math). Created/updated timestamps are UTC.
- Deleting is soft; deleted items disappear from lists and totals but can be restored for 30 days.
- A category or client in use cannot be hard-deleted, only archived.
- Totals are always computed per currency; never silently mix currencies.

## Success metrics

- Quick add from dashboard to saved in ≤ 3 interactions
- Dashboard loads in < 1.5s on a mid-range phone over 4G with 1,000 transactions
- Zero cross-user data leaks (verified by tenancy tests)

## Open questions

- Cash vs accrual view for invoices (default: cash, income counts when paid)
- Which tax regimes to support beyond a flat percentage
