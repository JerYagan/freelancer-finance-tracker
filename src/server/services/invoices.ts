import { and, desc, eq, ilike, isNull, lte, gte, sql, or } from "drizzle-orm";
import { db } from "../db/client";
import {
  categories,
  clients,
  invoices,
  projects,
  transactions,
  userSettings,
} from "../db/schema";
import { AppError } from "../http";
import {
  InvoiceCreateInput,
  InvoiceDerivedStatus,
  InvoiceDto,
  InvoiceMarkPaidInput,
  InvoiceQueryInput,
  InvoiceStatus,
  InvoiceUpdateInput,
} from "@/lib/schemas/invoices";
import { getTodayDateString, isValidDateString } from "@/lib/dates";
import { createTransaction } from "./transactions";

export interface InvoiceCursor {
  issuedOn: string;
  id: string;
}

export function encodeInvoiceCursor(issuedOn: string, id: string): string {
  return Buffer.from(JSON.stringify({ issuedOn, id })).toString("base64url");
}

export function decodeInvoiceCursor(cursor: string): InvoiceCursor | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.issuedOn === "string" &&
      typeof parsed.id === "string" &&
      isValidDateString(parsed.issuedOn)
    ) {
      return { issuedOn: parsed.issuedOn, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculates derived invoice status at read time.
 * If stored status is 'sent' and dueOn is before today, returns 'overdue'.
 */
export function deriveInvoiceStatus(
  status: InvoiceStatus,
  dueOn: string,
  today: string = getTodayDateString(),
): InvoiceDerivedStatus {
  if (status === "sent" && dueOn < today) {
    return "overdue";
  }
  return status;
}

export function toInvoiceDto(
  inv: typeof invoices.$inferSelect,
  client: { id: string; name: string },
  project: { id: string; name: string } | null,
  category: { id: string; name: string } | null,
  today: string = getTodayDateString(),
): InvoiceDto {
  const derivedStatus = deriveInvoiceStatus(
    inv.status as InvoiceStatus,
    inv.dueOn,
    today,
  );

  return {
    id: inv.id,
    number: inv.number,
    amountMinor: Number(inv.amountMinor),
    currency: inv.currency,
    status: inv.status as InvoiceStatus,
    derivedStatus,
    issuedOn: inv.issuedOn,
    dueOn: inv.dueOn,
    paidOn: inv.paidOn ?? null,
    client: {
      id: client.id,
      name: client.name,
    },
    project: project ? { id: project.id, name: project.name } : null,
    category: category ? { id: category.id, name: category.name } : null,
    notes: inv.notes ?? null,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

export interface InvoiceListResult {
  data: InvoiceDto[];
  meta: {
    nextCursor: string | null;
    limit: number;
  };
}

/**
 * Lists invoices with filtering, search, and cursor pagination.
 */
export async function listInvoices(
  userId: string,
  query?: InvoiceQueryInput,
  client = db,
): Promise<InvoiceListResult> {
  const limit = Math.min(Math.max(query?.limit ?? 50, 1), 100);
  const today = getTodayDateString();

  const conditions = [eq(invoices.userId, userId)];

  if (query?.clientId) {
    conditions.push(eq(invoices.clientId, query.clientId));
  }

  if (query?.projectId) {
    conditions.push(eq(invoices.projectId, query.projectId));
  }

  if (query?.from) {
    conditions.push(gte(invoices.issuedOn, query.from));
  }

  if (query?.to) {
    conditions.push(lte(invoices.issuedOn, query.to));
  }

  if (query?.q) {
    conditions.push(ilike(invoices.number, `%${query.q}%`));
  }

  if (query?.status) {
    if (query.status === "overdue") {
      conditions.push(
        and(eq(invoices.status, "sent"), sql`${invoices.dueOn} < ${today}`)!,
      );
    } else if (query.status === "sent") {
      conditions.push(
        and(eq(invoices.status, "sent"), sql`${invoices.dueOn} >= ${today}`)!,
      );
    } else {
      conditions.push(eq(invoices.status, query.status));
    }
  }

  if (query?.cursor) {
    const decoded = decodeInvoiceCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          sql`${invoices.issuedOn} < ${decoded.issuedOn}`,
          and(
            sql`${invoices.issuedOn} = ${decoded.issuedOn}`,
            sql`${invoices.id} < ${decoded.id}`,
          ),
        )!,
      );
    }
  }

  const rows = await client
    .select({
      inv: invoices,
      client: {
        id: clients.id,
        name: clients.name,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
      category: {
        id: categories.id,
        name: categories.name,
      },
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(categories, eq(invoices.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(invoices.issuedOn), desc(invoices.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      nextCursor = encodeInvoiceCursor(lastItem.inv.issuedOn, lastItem.inv.id);
    }
  }

  return {
    data: items.map((r) =>
      toInvoiceDto(
        r.inv,
        r.client,
        r.project?.id ? { id: r.project.id, name: r.project.name } : null,
        r.category?.id ? { id: r.category.id, name: r.category.name } : null,
        today,
      ),
    ),
    meta: {
      nextCursor,
      limit,
    },
  };
}

/**
 * Retrieves an invoice by ID.
 */
export async function getInvoiceById(
  userId: string,
  id: string,
  client = db,
): Promise<InvoiceDto> {
  const [row] = await client
    .select({
      inv: invoices,
      client: {
        id: clients.id,
        name: clients.name,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
      category: {
        id: categories.id,
        name: categories.name,
      },
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(categories, eq(invoices.categoryId, categories.id))
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Invoice not found");
  }

  return toInvoiceDto(
    row.inv,
    row.client,
    row.project?.id ? { id: row.project.id, name: row.project.name } : null,
    row.category?.id ? { id: row.category.id, name: row.category.name } : null,
  );
}

/**
 * Creates a new invoice with referential tenancy and uniqueness validation.
 */
export async function createInvoice(
  userId: string,
  input: InvoiceCreateInput,
  client = db,
): Promise<InvoiceDto> {
  // 1. Verify Client
  const [associatedClient] = await client
    .select({
      id: clients.id,
      name: clients.name,
      archivedAt: clients.archivedAt,
    })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), eq(clients.userId, userId)))
    .limit(1);

  if (!associatedClient) {
    throw AppError.notFound("Client not found");
  }

  if (associatedClient.archivedAt !== null) {
    throw AppError.conflict("Cannot assign an archived client to an invoice");
  }

  // 2. Verify Project if provided
  let projectInfo: { id: string; name: string } | null = null;
  if (input.projectId) {
    const [associatedProject] = await client
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
        archivedAt: projects.archivedAt,
      })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!associatedProject) {
      throw AppError.notFound("Project not found");
    }

    if (associatedProject.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived project to an invoice",
      );
    }

    if (
      associatedProject.clientId &&
      associatedProject.clientId !== input.clientId
    ) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }

    projectInfo = { id: associatedProject.id, name: associatedProject.name };
  }

  // 3. Verify Category if provided
  let categoryInfo: { id: string; name: string } | null = null;
  if (input.categoryId) {
    const [associatedCategory] = await client
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
        archivedAt: categories.archivedAt,
      })
      .from(categories)
      .where(
        and(eq(categories.id, input.categoryId), eq(categories.userId, userId)),
      )
      .limit(1);

    if (!associatedCategory) {
      throw AppError.notFound("Category not found");
    }

    if (associatedCategory.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived category to an invoice",
      );
    }

    if (associatedCategory.type !== "income") {
      throw AppError.ruleViolation(
        "Invoice category must be an income category",
      );
    }

    categoryInfo = { id: associatedCategory.id, name: associatedCategory.name };
  }

  // 4. Verify uniqueness of invoice number per user
  const [duplicateNumber] = await client
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        eq(invoices.userId, userId),
        sql`lower(${invoices.number}) = lower(${input.number})`,
      ),
    )
    .limit(1);

  if (duplicateNumber) {
    throw AppError.conflict(
      `An invoice with number "${input.number}" already exists`,
    );
  }

  // 5. Resolve currency
  let currency = input.currency;
  if (!currency) {
    const [settings] = await client
      .select({ defaultCurrency: userSettings.defaultCurrency })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    currency = settings?.defaultCurrency ?? "PHP";
  }

  // 6. Insert invoice
  const [created] = await client
    .insert(invoices)
    .values({
      userId,
      clientId: input.clientId,
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      number: input.number,
      amountMinor: input.amountMinor,
      currency: currency.toUpperCase(),
      issuedOn: input.issuedOn,
      dueOn: input.dueOn,
      status: input.status ?? "draft",
      notes: input.notes ?? null,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create invoice");
  }

  return toInvoiceDto(
    created,
    { id: associatedClient.id, name: associatedClient.name },
    projectInfo,
    categoryInfo,
  );
}

/**
 * Updates an invoice.
 */
export async function updateInvoice(
  userId: string,
  id: string,
  input: InvoiceUpdateInput,
  client = db,
): Promise<InvoiceDto> {
  const [existing] = await client
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Invoice not found");
  }

  if (existing.status === "paid" && input.status !== undefined) {
    throw AppError.conflict(
      "Cannot modify a paid invoice directly; void or adjust it instead",
    );
  }

  // 1. Verify client if changed
  let resolvedClientId = existing.clientId;
  if (input.clientId && input.clientId !== existing.clientId) {
    const [c] = await client
      .select({ id: clients.id, archivedAt: clients.archivedAt })
      .from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.userId, userId)))
      .limit(1);

    if (!c) {
      throw AppError.notFound("Client not found");
    }
    if (c.archivedAt !== null) {
      throw AppError.conflict("Cannot assign an archived client to an invoice");
    }
    resolvedClientId = input.clientId;
  }

  // 2. Verify project if changed or client changed
  const resolvedProjectId =
    input.projectId !== undefined ? input.projectId : existing.projectId;
  if (resolvedProjectId) {
    const [p] = await client
      .select({
        id: projects.id,
        clientId: projects.clientId,
        archivedAt: projects.archivedAt,
      })
      .from(projects)
      .where(
        and(eq(projects.id, resolvedProjectId), eq(projects.userId, userId)),
      )
      .limit(1);

    if (!p) {
      throw AppError.notFound("Project not found");
    }
    if (p.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived project to an invoice",
      );
    }
    if (p.clientId && p.clientId !== resolvedClientId) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }
  }

  // 3. Verify category if changed
  const resolvedCategoryId =
    input.categoryId !== undefined ? input.categoryId : existing.categoryId;
  if (resolvedCategoryId && resolvedCategoryId !== existing.categoryId) {
    const [cat] = await client
      .select({
        id: categories.id,
        type: categories.type,
        archivedAt: categories.archivedAt,
      })
      .from(categories)
      .where(
        and(
          eq(categories.id, resolvedCategoryId),
          eq(categories.userId, userId),
        ),
      )
      .limit(1);

    if (!cat) {
      throw AppError.notFound("Category not found");
    }
    if (cat.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived category to an invoice",
      );
    }
    if (cat.type !== "income") {
      throw AppError.ruleViolation(
        "Invoice category must be an income category",
      );
    }
  }

  // 4. Verify unique number if changed
  if (
    input.number &&
    input.number.toLowerCase() !== existing.number.toLowerCase()
  ) {
    const [duplicateNumber] = await client
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, userId),
          sql`lower(${invoices.number}) = lower(${input.number})`,
        ),
      )
      .limit(1);

    if (duplicateNumber) {
      throw AppError.conflict(
        `An invoice with number "${input.number}" already exists`,
      );
    }
  }

  const issuedOn = input.issuedOn ?? existing.issuedOn;
  const dueOn = input.dueOn ?? existing.dueOn;
  if (dueOn < issuedOn) {
    throw AppError.validation("dueOn must be on or after issuedOn");
  }

  const [updated] = await client
    .update(invoices)
    .set({
      clientId: resolvedClientId,
      projectId: resolvedProjectId ?? null,
      categoryId: resolvedCategoryId ?? null,
      number: input.number ?? existing.number,
      amountMinor: input.amountMinor ?? existing.amountMinor,
      currency: input.currency
        ? input.currency.toUpperCase()
        : existing.currency,
      issuedOn,
      dueOn,
      status: input.status ?? existing.status,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.internal("Failed to update invoice");
  }

  return getInvoiceById(userId, id, client);
}

/**
 * Marks an invoice as paid and automatically generates an income transaction.
 */
export async function markInvoicePaid(
  userId: string,
  id: string,
  input?: InvoiceMarkPaidInput,
  client = db,
): Promise<InvoiceDto> {
  const [existing] = await client
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Invoice not found");
  }

  if (existing.status === "paid") {
    throw AppError.conflict("Invoice is already marked as paid");
  }

  if (existing.status === "void") {
    throw AppError.conflict("Cannot mark a void invoice as paid");
  }

  const paidOn = input?.paidOn ?? getTodayDateString();

  // Resolve income category: use invoice.categoryId or fallback to user's first active income category
  let resolvedCategoryId = existing.categoryId;
  if (!resolvedCategoryId) {
    const [primaryIncomeCat] = await client
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.type, "income"),
          isNull(categories.archivedAt),
        ),
      )
      .limit(1);

    if (!primaryIncomeCat) {
      throw AppError.conflict(
        "No active income category found to create payment transaction",
      );
    }
    resolvedCategoryId = primaryIncomeCat.id;
  }

  // Create income transaction tied to this invoice
  await createTransaction(
    userId,
    {
      type: "income",
      amountMinor: Number(existing.amountMinor),
      currency: existing.currency,
      occurredOn: paidOn,
      categoryId: resolvedCategoryId,
      clientId: existing.clientId,
      projectId: existing.projectId ?? null,
      description: `Payment for Invoice ${existing.number}`,
      notes: existing.notes ?? null,
      paymentMethod: "bank",
    },
    client,
    { invoiceId: existing.id },
  );

  // Transition invoice to paid
  await client
    .update(invoices)
    .set({
      status: "paid",
      paidOn,
      updatedAt: new Date(),
    })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

  return getInvoiceById(userId, id, client);
}

/**
 * Deletes an invoice.
 * Rejects if the invoice is paid or has associated payment transactions.
 */
export async function deleteInvoice(
  userId: string,
  id: string,
  client = db,
): Promise<{ id: string; deleted: true }> {
  const [existing] = await client
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Invoice not found");
  }

  if (existing.status === "paid") {
    throw AppError.conflict("Cannot delete a paid invoice. Void it instead.");
  }

  const [associatedTx] = await client
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.invoiceId, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (associatedTx) {
    throw AppError.conflict(
      "Cannot delete an invoice with associated payment transactions. Void it instead.",
    );
  }

  await client
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

  return { id, deleted: true };
}
