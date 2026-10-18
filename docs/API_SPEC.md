# API_SPEC

REST JSON under `/api/v1`. Auth routes under `/api/auth/*` are handled by Better Auth and are not documented here.

## Global rules

- All `/api/v1` endpoints require a valid session cookie. Missing/invalid → `401`.
- Every resource is scoped to the session user. Accessing another user's id returns `404` (not `403`) to avoid leaking existence.
- Request bodies and query strings are validated with the Zod schemas in `src/lib/schemas`.
- Money fields are integers in minor units. Dates are `YYYY-MM-DD`. Timestamps are ISO 8601 UTC.
- IDs are UUID strings.

## Envelopes

Success (single): `{ "data": { ... } }`

Success (list): `{ "data": [ ... ], "meta": { "nextCursor": "string|null", "limit": 50 } }`

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "fields": { "amountMinor": "Must be greater than 0" }
  }
}
```

`fields` is present only for validation errors.

| HTTP | code             | When                                                |
| ---- | ---------------- | --------------------------------------------------- |
| 400  | VALIDATION_ERROR | Body/query failed Zod                               |
| 401  | UNAUTHENTICATED  | No/expired session                                  |
| 404  | NOT_FOUND        | Missing or not owned                                |
| 409  | CONFLICT         | Duplicate name, archived reference, in-use deletion |
| 422  | RULE_VIOLATION   | Integrity rule broken (category type mismatch etc.) |
| 429  | RATE_LIMITED     | Too many requests                                   |
| 500  | INTERNAL         | Unexpected                                          |

## Pagination

Cursor-based: `?limit=50&cursor=<opaque>`. `limit` 1–100, default 50. Cursor encodes `(occurred_on, id)`.

## Transactions

### DTO

```json
{
  "id": "uuid",
  "type": "income",
  "amountMinor": 1500000,
  "currency": "PHP",
  "occurredOn": "2026-10-15",
  "category": { "id": "uuid", "name": "Client work" },
  "client": { "id": "uuid", "name": "Acme" },
  "project": null,
  "description": "Landing page, milestone 2",
  "notes": null,
  "paymentMethod": "bank",
  "createdAt": "2026-10-15T09:30:00Z",
  "updatedAt": "2026-10-15T09:30:00Z"
}
```

### GET /api/v1/transactions

Query: `from`, `to` (dates, inclusive), `type`, `categoryId`, `clientId`, `projectId`, `q` (text search on description/notes), `limit`, `cursor`.
Returns list envelope, ordered `occurredOn desc, id desc`. Excludes soft-deleted.

### POST /api/v1/transactions

Body:

```json
{
  "type": "expense",
  "amountMinor": 49900,
  "currency": "PHP",
  "occurredOn": "2026-10-14",
  "categoryId": "uuid",
  "clientId": null,
  "projectId": null,
  "description": "Figma subscription",
  "notes": null,
  "paymentMethod": "card"
}
```

`201` with single envelope. `currency` defaults to the user's default currency if omitted.

### GET /api/v1/transactions/:id

`200` single | `404`.

### PATCH /api/v1/transactions/:id

Partial body, same fields as POST. `200` single.

### DELETE /api/v1/transactions/:id

Soft delete. `204`.

### POST /api/v1/transactions/:id/restore

Restores within 30 days. `200` single | `404`.

## Categories

### GET /api/v1/categories

Query: `type` (optional), `includeArchived` (default false). Returns list (no pagination).

### POST /api/v1/categories

Body: `{ "type": "expense", "name": "Hosting", "color": "#0ea5e9" }` → `201`.

### PATCH /api/v1/categories/:id

Body: `name`, `color`, `archived` (boolean). `type` is immutable.

### DELETE /api/v1/categories/:id

`204` if unused, else `409 CONFLICT` with message to archive instead.

## Clients and Projects

### GET /api/v1/clients · POST /api/v1/clients

Client body: `{ "name": "Acme", "email": "ap@acme.com", "notes": null }`.

### PATCH /api/v1/clients/:id · DELETE /api/v1/clients/:id

Same archive-or-409 rule as categories. PATCH accepts `archived`.

### GET /api/v1/projects?clientId= · POST /api/v1/projects

Project body: `{ "name": "Website redesign", "clientId": "uuid|null" }`.

### PATCH /api/v1/projects/:id · DELETE /api/v1/projects/:id

Same rules.

## Reports

### GET /api/v1/reports/summary?month=2026-10

```json
{
  "data": {
    "month": "2026-10",
    "currency": "PHP",
    "incomeMinor": 8500000,
    "expenseMinor": 2100000,
    "netMinor": 6400000,
    "taxSetAsideMinor": 960000,
    "topClients": [
      { "clientId": "uuid", "name": "Acme", "incomeMinor": 5000000 }
    ],
    "topExpenseCategories": [
      { "categoryId": "uuid", "name": "Software", "expenseMinor": 900000 }
    ]
  }
}
```

`taxSetAsideMinor = floor(max(net,0) * tax_set_aside_bps / 10000)`. If the user has several currencies, `currency` query param is required (`400` otherwise).

### GET /api/v1/reports/trend?months=6&currency=PHP

Returns `[{ "month": "2026-05", "incomeMinor": 0, "expenseMinor": 0, "netMinor": 0 }, ...]` oldest first, zero-filled.

### GET /api/v1/reports/tax-summary?year=2026&quarter=4&currency=PHP

Returns quarterly tax set-aside summary based on user's `taxSetAsideBps` setting and `fiscalYearStartMonth`.
Query params:

- `year`: Optional 4-digit fiscal year (defaults to current fiscal year for today).
- `quarter`: Optional 1 | 2 | 3 | 4 (defaults to current fiscal quarter for today).
- `currency`: Optional currency code. Required if multiple currencies exist in the quarter.

Response:

```json
{
  "data": {
    "year": 2026,
    "quarter": 4,
    "label": "Q4 2026",
    "startDate": "2026-10-01",
    "endDate": "2026-12-31",
    "currency": "PHP",
    "incomeMinor": 15000000,
    "expenseMinor": 3000000,
    "netMinor": 12000000,
    "taxSetAsideBps": 1500,
    "taxSetAsidePercent": 15,
    "taxSetAsideMinor": 1800000,
    "months": [
      {
        "month": "2026-10",
        "incomeMinor": 5000000,
        "expenseMinor": 1000000,
        "netMinor": 4000000,
        "taxSetAsideMinor": 600000
      },
      {
        "month": "2026-11",
        "incomeMinor": 5000000,
        "expenseMinor": 1000000,
        "netMinor": 4000000,
        "taxSetAsideMinor": 600000
      },
      {
        "month": "2026-12",
        "incomeMinor": 5000000,
        "expenseMinor": 1000000,
        "netMinor": 4000000,
        "taxSetAsideMinor": 600000
      }
    ]
  }
}
```

`taxSetAsideMinor = Math.floor(Math.max(netMinor, 0) * taxSetAsideBps / 10000)`.
Negative net profit produces `0` tax set-aside.

## Export

### GET /api/v1/export/transactions.csv?from=&to=

`text/csv` stream. Columns: `date,type,amount,currency,category,client,project,description,payment_method`. `amount` is a decimal string formatted from minor units.

## Settings

### GET /api/v1/settings · PATCH /api/v1/settings

Body fields: `displayName`, `defaultCurrency`, `taxSetAsideBps`, `fiscalYearStartMonth`.

## Invoices

### DTO

```json
{
  "id": "uuid",
  "number": "INV-2026-001",
  "amountMinor": 2500000,
  "currency": "PHP",
  "status": "sent",
  "derivedStatus": "overdue",
  "issuedOn": "2026-10-01",
  "dueOn": "2026-10-15",
  "paidOn": null,
  "client": { "id": "uuid", "name": "Acme Corp" },
  "project": { "id": "uuid", "name": "Website Redesign" },
  "category": { "id": "uuid", "name": "Client work" },
  "notes": "Payment due in 14 days",
  "createdAt": "2026-10-01T08:00:00Z",
  "updatedAt": "2026-10-01T08:00:00Z"
}
```

`derivedStatus`:
Stored in database as `draft`, `sent`, `paid`, or `void`.
If stored `status == 'sent'` and `dueOn < today`, `derivedStatus` is `'overdue'`. Otherwise `derivedStatus == status`.

### GET /api/v1/invoices

Query: `clientId`, `projectId`, `status` (`draft|sent|paid|overdue|void`), `from`, `to`, `q`, `limit`, `cursor`.
Returns list envelope, ordered `issuedOn desc, id desc`.

### POST /api/v1/invoices

Body:

```json
{
  "clientId": "uuid",
  "projectId": "uuid|null",
  "categoryId": "uuid|null",
  "number": "INV-2026-001",
  "amountMinor": 2500000,
  "currency": "PHP",
  "issuedOn": "2026-10-18",
  "dueOn": "2026-11-01",
  "status": "draft",
  "notes": null
}
```

`status` defaults to `draft` (may be `draft` or `sent`). `201` with single envelope.
Validation rules:

- `amountMinor > 0`
- `number` 1–50 chars, unique per user (`409 CONFLICT` if duplicate)
- `clientId` must belong to user and not be archived (`409 CONFLICT` if archived, `404` if not found)
- `projectId` if set must belong to user and match `clientId` (`422 RULE_VIOLATION`)
- `categoryId` if set must belong to user and have `type == 'income'` (`422 RULE_VIOLATION`)
- `dueOn >= issuedOn` (`400 VALIDATION_ERROR`)

### GET /api/v1/invoices/:id

`200` single envelope | `404`.

### PATCH /api/v1/invoices/:id

Partial body: `number`, `clientId`, `projectId`, `categoryId`, `amountMinor`, `currency`, `issuedOn`, `dueOn`, `status` (`draft|sent|void`), `notes`.
Rules:

- Cannot modify amount or currency of a `paid` or `void` invoice (`422 RULE_VIOLATION`).
- Cannot mark `paid` via PATCH; must use `/mark-paid` endpoint.
- `200` single envelope | `404`.

### POST /api/v1/invoices/:id/mark-paid

Marks an invoice as paid and automatically creates a linked income transaction.
Body:

```json
{
  "paidOn": "2026-10-18",
  "categoryId": "uuid|null",
  "paymentMethod": "bank|null"
}
```

Rules:

- Cannot mark paid if already `paid` or `void` (`422 RULE_VIOLATION`).
- Creates income transaction with `invoice_id = invoice.id`, `occurred_on = paidOn || today`, `amount_minor = invoice.amount_minor`, `category_id = categoryId || invoice.category_id || defaultIncomeCategory.id`.
- Returns `200` with `{ "data": { "invoice": { ... }, "transaction": { ... } } }`.

### DELETE /api/v1/invoices/:id

Rules:

- Allowed only for `draft` or `void` invoices that have no associated transaction.
- Invoices in `paid` or `sent` status with transactions return `409 CONFLICT` with message suggesting to void the invoice instead.
- `204`.

## Recurring Transactions

### DTO

```json
{
  "id": "uuid",
  "interval": "monthly",
  "nextRunOn": "2026-11-01",
  "endsOn": "2027-10-01",
  "active": true,
  "template": {
    "type": "expense",
    "amountMinor": 49900,
    "currency": "PHP",
    "categoryId": "uuid",
    "clientId": null,
    "projectId": null,
    "description": "Figma Subscription",
    "paymentMethod": "card",
    "notes": null
  },
  "category": { "id": "uuid", "name": "Software", "color": "#6366f1" },
  "client": null,
  "project": null,
  "createdAt": "2026-10-18T10:00:00Z",
  "updatedAt": "2026-10-18T10:00:00Z"
}
```

### GET /api/v1/recurring

Query: `active` (boolean, optional).
Returns list envelope ordered by `nextRunOn asc`.

### POST /api/v1/recurring

Body:

```json
{
  "interval": "monthly",
  "nextRunOn": "2026-11-01",
  "endsOn": null,
  "template": {
    "type": "expense",
    "amountMinor": 49900,
    "currency": "PHP",
    "categoryId": "uuid",
    "clientId": null,
    "projectId": null,
    "description": "Figma Subscription",
    "paymentMethod": "card",
    "notes": null
  }
}
```

Validation:

- `interval` in `['weekly', 'monthly', 'quarterly', 'yearly']`
- `endsOn` null or date `>= nextRunOn`
- `template.type` in `['income', 'expense']`
- `template.amountMinor > 0`
- `template.categoryId` must belong to user and have matching type (`422 RULE_VIOLATION`)
- `template.clientId` and `template.projectId` must belong to user
  `201` single envelope.

### GET /api/v1/recurring/:id

`200` single envelope | `404`.

### PATCH /api/v1/recurring/:id

Partial body: `interval`, `nextRunOn`, `endsOn`, `active`, `template`.
`200` single envelope | `404`.

### DELETE /api/v1/recurring/:id

Deletes the recurring rule. Sets `recurring_rule_id = null` on past generated transactions.
`204`.

### POST /api/v1/recurring/generate

Scheduled job or manual trigger to generate due transactions for active rules.
Query or Body: `throughDate` (date string, defaults to current date).
Generates a transaction for each active rule where `nextRunOn <= throughDate`, advances `nextRunOn` iteratively until `nextRunOn > throughDate`, and marks `active = false` if `endsOn` is passed.
Returns `200`:

```json
{
  "data": {
    "generatedCount": 1,
    "transactions": []
  }
}
```

## CSV Import

### POST /api/v1/import/transactions/preview

Parses CSV text according to column mapping, validates every row, and returns detected headers, valid/error counts, and row previews without writing to the database.

Body:

```json
{
  "csvText": "Date,Description,Amount,Category\n2026-10-01,Client Retainer,50000,Client work",
  "mapping": {
    "dateColumn": "Date",
    "amountColumn": "Amount",
    "typeColumn": null,
    "descriptionColumn": "Description",
    "categoryColumn": "Category",
    "clientColumn": null,
    "paymentMethodColumn": null,
    "defaultType": "income",
    "defaultCategoryId": "uuid|null",
    "currency": "PHP",
    "dateFormat": "YYYY-MM-DD"
  }
}
```

Response `200`:

```json
{
  "data": {
    "totalRows": 1,
    "validCount": 1,
    "errorCount": 0,
    "headers": ["Date", "Description", "Amount", "Category"],
    "preview": [
      {
        "rowIndex": 0,
        "isValid": true,
        "errors": [],
        "parsed": {
          "occurredOn": "2026-10-01",
          "type": "income",
          "amountMinor": 5000000,
          "currency": "PHP",
          "categoryId": "uuid",
          "description": "Client Retainer",
          "clientId": null,
          "paymentMethod": null
        },
        "raw": {
          "Date": "2026-10-01",
          "Description": "Client Retainer",
          "Amount": "50000",
          "Category": "Client work"
        }
      }
    ]
  }
}
```

### POST /api/v1/import/transactions

Executes the CSV import, committing valid transactions into the database.

Body:

```json
{
  "csvText": "...",
  "mapping": { ... },
  "skipInvalid": true
}
```

Response `200`:

```json
{
  "data": {
    "importedCount": 1,
    "skippedCount": 0,
    "transactions": [ ... ]
  }
}
```

Validation & parsing rules:

- `csvText` required (maximum 2MB, up to 5,000 rows).
- `dateColumn` and `amountColumn` are required in mapping.
- Amounts: parsed from decimal string to integer minor units via `parseMoneyToMinor`. If signed, negative amounts denote expense and positive denote income unless explicit `typeColumn` or `defaultType` is set.
- Dates: parsed using `dateFormat` (`YYYY-MM-DD`, `MM/DD/YYYY`, or `DD/MM/YYYY`) into canonical `YYYY-MM-DD`.
- Categories: matched case-insensitively against user's active categories matching transaction type. If unmatched, falls back to `defaultCategoryId`. If no category can be resolved, row has validation error.
- Clients: matched case-insensitively against user's active clients.
- If `skipInvalid == false` and there are invalid rows, returns `422 RULE_VIOLATION` with details. If `skipInvalid == true`, skips invalid rows and imports all valid rows.

## Receipts (Phase 4.2)

### `POST /api/v1/transactions/:id/receipt`

Requests a presigned PUT URL to upload an expense receipt attachment directly to S3-compatible object storage.

**Headers:**
`Content-Type: application/json`

**Path parameters:**

- `id`: UUID of the transaction. Must belong to the authenticated user, not be soft-deleted, and have `type == "expense"`.

**Request body:**

```json
{
  "fileName": "receipt-october.jpg",
  "contentType": "image/jpeg",
  "fileSizeBytes": 2048500
}
```

- `fileName`: string (1..255 chars)
- `contentType`: `"image/jpeg" | "image/png" | "application/pdf"`
- `fileSizeBytes`: integer between 1 and 10,485,760 (10 MB max)

**Response 200 OK:**

```json
{
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "receiptKey": "users/user_abc123/receipts/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.jpg",
    "uploadUrl": "https://...",
    "expiresInSeconds": 900,
    "headers": {
      "Content-Type": "image/jpeg"
    }
  }
}
```

_Side effects:_ Transaction's `receiptKey` is updated with the storage key.

**Errors:**

- `401 UNAUTHENTICATED`: user not logged in.
- `404 NOT_FOUND`: transaction not found or belongs to another user.
- `422 RULE_VIOLATION`: transaction is an income (receipts allowed only on expenses) or file size exceeds 10 MB or unsupported content type.

---

### `GET /api/v1/transactions/:id/receipt`

Retrieves a presigned GET / download URL to view or download the attached receipt.

**Response 200 OK:**

```json
{
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "receiptKey": "users/user_abc123/receipts/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.jpg",
    "downloadUrl": "https://...",
    "expiresInSeconds": 900
  }
}
```

**Errors:**

- `401 UNAUTHENTICATED`: user not logged in.
- `404 NOT_FOUND`: transaction not found, belongs to another user, or has no attached receipt.

---

### `DELETE /api/v1/transactions/:id/receipt`

Removes the receipt attachment from the transaction and deletes the object from storage.

**Response 200 OK:**

```json
{
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "deleted": true
  }
}
```

**Errors:**

- `401 UNAUTHENTICATED`: user not logged in.
- `404 NOT_FOUND`: transaction not found, belongs to another user, or has no attached receipt.

---

## Maintenance (Phase 4.3)

### `POST /api/v1/maintenance/purge`

Permanently hard-deletes soft-deleted transactions older than 30 days and removes their receipt attachments from storage.

**Headers:**

- `Authorization: Bearer <CRON_SECRET>` (when `CRON_SECRET` is configured)
- `Content-Type: application/json` (optional)

**Request body (optional):**

```json
{
  "olderThanDays": 30
}
```

**Response 200 OK:**

```json
{
  "data": {
    "purgedCount": 12,
    "receiptKeysDeleted": ["users/user_1/receipts/rec-abc.jpg"],
    "cutoffDate": "2026-09-18T00:00:00.000Z"
  }
}
```

**Errors:**

- `401 UNAUTHENTICATED`: invalid or missing bearer token when `CRON_SECRET` is set.

---

## Account Data & Privacy (Phase 4.4)

### `GET /api/v1/account/export`

Exports a complete JSON data bundle containing the user profile, settings, categories, clients, projects, invoices, recurring rules, and transactions.

**Headers:**

- `Content-Type: application/json`

**Response 200 OK:**
Headers: `Content-Disposition: attachment; filename="freelancer-finance-account-export-YYYY-MM-DD.json"`
Body:

```json
{
  "data": {
    "exportedAt": "2026-10-18T10:00:00.000Z",
    "user": {
      "id": "user_123",
      "name": "Jane Freelancer",
      "email": "jane@example.com",
      "createdAt": "2026-10-18T00:00:00.000Z"
    },
    "settings": {
      "displayName": "Jane",
      "defaultCurrency": "PHP",
      "taxSetAsideBps": 2000,
      "fiscalYearStartMonth": 1
    },
    "categories": [],
    "clients": [],
    "projects": [],
    "invoices": [],
    "recurringRules": [],
    "transactions": []
  }
}
```

**Errors:**

- `401 UNAUTHENTICATED`: user not logged in.

---

### `DELETE /api/v1/account`

Permanently hard-deletes the user's account, removes all associated receipt files from storage, and cascades hard deletion across all user-owned rows in PostgreSQL.

**Headers:**

- `Content-Type: application/json`

**Request body:**

```json
{
  "confirmPhrase": "DELETE"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "deleted": true
  }
}
```

**Errors:**

- `401 UNAUTHENTICATED`: user not logged in.
- `422 VALIDATION_ERROR`: confirmation phrase does not match `"DELETE"`.
