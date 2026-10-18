import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  or,
  lt,
} from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  categories,
  clients,
  projects,
  transactions,
  userSettings,
} from "@/server/db/schema";
import { AppError } from "@/server/http";
import type {
  TransactionCreateInput,
  TransactionDto,
  TransactionQueryInput,
  TransactionUpdateInput,
} from "@/lib/schemas/transactions";

export interface TransactionListResult {
  data: TransactionDto[];
  meta: {
    nextCursor: string | null;
    limit: number;
  };
}

export function encodeCursor(occurredOn: string, id: string): string {
  return Buffer.from(JSON.stringify({ occurredOn, id })).toString("base64url");
}

export function decodeCursor(
  cursorStr: string,
): { occurredOn: string; id: string } | null {
  try {
    const json = Buffer.from(cursorStr, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (
      typeof parsed.occurredOn === "string" &&
      typeof parsed.id === "string"
    ) {
      return { occurredOn: parsed.occurredOn, id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}

export function toTransactionDto(
  tx: typeof transactions.$inferSelect,
  category: { id: string; name: string; color: string | null },
  client: { id: string; name: string } | null,
  project: { id: string; name: string } | null,
): TransactionDto {
  return {
    id: tx.id,
    type: tx.type,
    amountMinor: Number(tx.amountMinor),
    currency: tx.currency,
    occurredOn: tx.occurredOn,
    category: {
      id: category.id,
      name: category.name,
      color: category.color ?? null,
    },
    client: client ? { id: client.id, name: client.name } : null,
    project: project ? { id: project.id, name: project.name } : null,
    description: tx.description ?? null,
    notes: tx.notes ?? null,
    paymentMethod: tx.paymentMethod ?? null,
    receiptKey: tx.receiptKey ?? null,
    createdAt: tx.createdAt.toISOString(),
    updatedAt: tx.updatedAt.toISOString(),
  };
}

/**
 * Lists transactions with filtering and cursor pagination (occurredOn desc, id desc).
 * Excludes soft-deleted transactions.
 */
export async function listTransactions(
  userId: string,
  query?: TransactionQueryInput,
  client = db,
): Promise<TransactionListResult> {
  const limit = Math.min(Math.max(query?.limit ?? 50, 1), 100);
  const conditions = [
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
  ];

  if (query?.from) {
    conditions.push(gte(transactions.occurredOn, query.from));
  }

  if (query?.to) {
    conditions.push(lte(transactions.occurredOn, query.to));
  }

  if (query?.type) {
    conditions.push(eq(transactions.type, query.type));
  }

  if (query?.categoryId) {
    conditions.push(eq(transactions.categoryId, query.categoryId));
  }

  if (query?.clientId) {
    conditions.push(eq(transactions.clientId, query.clientId));
  }

  if (query?.projectId) {
    conditions.push(eq(transactions.projectId, query.projectId));
  }

  if (query?.q) {
    const searchPattern = `%${query.q.trim()}%`;
    conditions.push(
      or(
        ilike(transactions.description, searchPattern),
        ilike(transactions.notes, searchPattern),
      )!,
    );
  }

  if (query?.cursor) {
    const decoded = decodeCursor(query.cursor);
    if (decoded) {
      conditions.push(
        or(
          lt(transactions.occurredOn, decoded.occurredOn),
          and(
            eq(transactions.occurredOn, decoded.occurredOn),
            lt(transactions.id, decoded.id),
          ),
        )!,
      );
    }
  }

  // Fetch limit + 1 to determine if next page exists
  const rows = await client
    .select({
      tx: transactions,
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
      },
      client: {
        id: clients.id,
        name: clients.name,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    if (lastItem) {
      nextCursor = encodeCursor(lastItem.tx.occurredOn, lastItem.tx.id);
    }
  }

  return {
    data: items.map((r) =>
      toTransactionDto(
        r.tx,
        r.category,
        r.client?.id ? { id: r.client.id, name: r.client.name } : null,
        r.project?.id ? { id: r.project.id, name: r.project.name } : null,
      ),
    ),
    meta: {
      nextCursor,
      limit,
    },
  };
}

/**
 * Retrieves a single active transaction by ID scoped to the authenticated user.
 */
export async function getTransactionById(
  userId: string,
  id: string,
  client = db,
): Promise<TransactionDto> {
  const [row] = await client
    .select({
      tx: transactions,
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
      },
      client: {
        id: clients.id,
        name: clients.name,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw AppError.notFound("Transaction not found");
  }

  return toTransactionDto(
    row.tx,
    row.category,
    row.client?.id ? { id: row.client.id, name: row.client.name } : null,
    row.project?.id ? { id: row.project.id, name: row.project.name } : null,
  );
}

/**
 * Creates a transaction, enforcing category type integrity, client/project consistency, and active references.
 */
export async function createTransaction(
  userId: string,
  input: TransactionCreateInput,
  client = db,
  options?: { recurringRuleId?: string | null; invoiceId?: string | null },
): Promise<TransactionDto> {
  // 1. Verify Category exists, belongs to user, matches type, and is not archived
  const [category] = await client
    .select()
    .from(categories)
    .where(
      and(eq(categories.id, input.categoryId), eq(categories.userId, userId)),
    )
    .limit(1);

  if (!category) {
    throw AppError.notFound("Category not found");
  }

  if (category.archivedAt !== null) {
    throw AppError.conflict(
      "Cannot assign an archived category to a transaction",
    );
  }

  if (category.type !== input.type) {
    throw AppError.ruleViolation(
      `Category "${category.name}" is an ${category.type} category, but transaction is ${input.type}`,
    );
  }

  // 2. Verify Client if provided
  let clientInfo: { id: string; name: string } | null = null;
  let resolvedClientId = input.clientId ?? null;
  if (input.clientId) {
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
      throw AppError.conflict(
        "Cannot assign an archived client to a transaction",
      );
    }

    clientInfo = { id: associatedClient.id, name: associatedClient.name };
  }

  // 3. Verify Project if provided, including client consistency check
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
        "Cannot assign an archived project to a transaction",
      );
    }

    // Consistency check: if project is tied to a client and transaction specifies a client, they must match!
    if (
      associatedProject.clientId &&
      resolvedClientId &&
      associatedProject.clientId !== resolvedClientId
    ) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }

    // Auto-populate clientId from project if not explicitly set
    if (associatedProject.clientId && !resolvedClientId) {
      resolvedClientId = associatedProject.clientId;
      if (!clientInfo) {
        const [c] = await client
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(
            and(
              eq(clients.id, associatedProject.clientId),
              eq(clients.userId, userId),
            ),
          )
          .limit(1);
        if (c) clientInfo = c;
      }
    }

    projectInfo = { id: associatedProject.id, name: associatedProject.name };
  }

  // 4. Resolve currency: use input currency, or user's defaultCurrency, or "PHP"
  let currency = input.currency;
  if (!currency) {
    const [settings] = await client
      .select({ defaultCurrency: userSettings.defaultCurrency })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    currency = settings?.defaultCurrency ?? "PHP";
  }

  // 5. Insert transaction
  const [created] = await client
    .insert(transactions)
    .values({
      userId,
      type: input.type,
      amountMinor: input.amountMinor,
      currency: currency.toUpperCase(),
      occurredOn: input.occurredOn,
      categoryId: input.categoryId,
      clientId: resolvedClientId,
      projectId: input.projectId ?? null,
      invoiceId: options?.invoiceId ?? null,
      recurringRuleId: options?.recurringRuleId ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      paymentMethod: input.paymentMethod ?? null,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create transaction");
  }

  return toTransactionDto(created, category, clientInfo, projectInfo);
}

/**
 * Updates an active transaction.
 */
export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionUpdateInput,
  client = db,
): Promise<TransactionDto> {
  const [existing] = await client
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Transaction not found");
  }

  const targetType = input.type ?? existing.type;
  const targetCategoryId = input.categoryId ?? existing.categoryId;

  // 1. Verify Category if changed or if type changed
  const [category] = await client
    .select()
    .from(categories)
    .where(
      and(eq(categories.id, targetCategoryId), eq(categories.userId, userId)),
    )
    .limit(1);

  if (!category) {
    throw AppError.notFound("Category not found");
  }

  if (category.type !== targetType) {
    throw AppError.ruleViolation(
      `Category "${category.name}" is an ${category.type} category, but transaction is ${targetType}`,
    );
  }

  // 2. Client verification
  const targetClientId =
    input.clientId !== undefined ? input.clientId : existing.clientId;
  let clientInfo: { id: string; name: string } | null = null;

  if (targetClientId) {
    const [c] = await client
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(eq(clients.id, targetClientId), eq(clients.userId, userId)))
      .limit(1);

    if (!c) {
      throw AppError.notFound("Client not found");
    }
    clientInfo = c;
  }

  // 3. Project verification and client consistency
  const targetProjectId =
    input.projectId !== undefined ? input.projectId : existing.projectId;
  let projectInfo: { id: string; name: string } | null = null;

  if (targetProjectId) {
    const [p] = await client
      .select({
        id: projects.id,
        name: projects.name,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(and(eq(projects.id, targetProjectId), eq(projects.userId, userId)))
      .limit(1);

    if (!p) {
      throw AppError.notFound("Project not found");
    }

    if (p.clientId && targetClientId && p.clientId !== targetClientId) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }

    projectInfo = { id: p.id, name: p.name };
  }

  const updateValues: Partial<typeof transactions.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.type !== undefined) updateValues.type = input.type;
  if (input.amountMinor !== undefined)
    updateValues.amountMinor = input.amountMinor;
  if (input.currency !== undefined)
    updateValues.currency = input.currency.toUpperCase();
  if (input.occurredOn !== undefined)
    updateValues.occurredOn = input.occurredOn;
  if (input.categoryId !== undefined)
    updateValues.categoryId = input.categoryId;
  if (input.clientId !== undefined) updateValues.clientId = input.clientId;
  if (input.projectId !== undefined) updateValues.projectId = input.projectId;
  if (input.description !== undefined)
    updateValues.description = input.description;
  if (input.notes !== undefined) updateValues.notes = input.notes;
  if (input.paymentMethod !== undefined)
    updateValues.paymentMethod = input.paymentMethod;

  const [updated] = await client
    .update(transactions)
    .set(updateValues)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Transaction not found");
  }

  return toTransactionDto(updated, category, clientInfo, projectInfo);
}

/**
 * Soft deletes a transaction by setting deleted_at = now().
 */
export async function deleteTransaction(
  userId: string,
  id: string,
  client = db,
): Promise<void> {
  const [existing] = await client
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Transaction not found");
  }

  await client
    .update(transactions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

/**
 * Restores a soft-deleted transaction if within the 30-day window.
 */
export async function restoreTransaction(
  userId: string,
  id: string,
  client = db,
): Promise<TransactionDto> {
  const [row] = await client
    .select({
      tx: transactions,
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
      },
      client: {
        id: clients.id,
        name: clients.name,
      },
      project: {
        id: projects.id,
        name: projects.name,
      },
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        isNotNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw AppError.notFound("Transaction not found or not deleted");
  }

  // Check 30-day restore window
  const deletedAt = row.tx.deletedAt ? new Date(row.tx.deletedAt) : null;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (!deletedAt || deletedAt < thirtyDaysAgo) {
    throw AppError.notFound("Transaction cannot be restored: exceeded 30 days");
  }

  const [restored] = await client
    .update(transactions)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();

  if (!restored) {
    throw AppError.notFound("Transaction not found");
  }

  return toTransactionDto(
    restored,
    row.category,
    row.client?.id ? { id: row.client.id, name: row.client.name } : null,
    row.project?.id ? { id: row.project.id, name: row.project.name } : null,
  );
}
