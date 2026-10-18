import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  categories,
  clients,
  projects,
  transactions,
} from "@/server/db/schema";
import { formatMinorToDecimal } from "@/lib/money";
import { formatTransactionsToCsv, type CsvTransactionRecord } from "@/lib/csv";
import type { ExportTransactionsQueryInput } from "@/lib/schemas/reports";

/**
 * Fetches transactions for a user (optionally filtered by date range)
 * and formats them into an RFC 4180 compliant CSV document with formula-injection escaping.
 */
export async function exportTransactionsCsv(
  userId: string,
  query: ExportTransactionsQueryInput = {},
  client = db,
): Promise<string> {
  const conditions = [
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
  ];

  if (query.from) {
    conditions.push(gte(transactions.occurredOn, query.from));
  }
  if (query.to) {
    conditions.push(lte(transactions.occurredOn, query.to));
  }

  const rows = await client
    .select({
      occurredOn: transactions.occurredOn,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      categoryName: categories.name,
      clientName: clients.name,
      projectName: projects.name,
      description: transactions.description,
      paymentMethod: transactions.paymentMethod,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(projects, eq(transactions.projectId, projects.id))
    .where(and(...conditions))
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

  const records: CsvTransactionRecord[] = rows.map((r) => ({
    date: r.occurredOn,
    type: r.type,
    amount: formatMinorToDecimal(Number(r.amountMinor), r.currency),
    currency: r.currency,
    category: r.categoryName ?? "",
    client: r.clientName ?? "",
    project: r.projectName ?? "",
    description: r.description ?? "",
    payment_method: r.paymentMethod ?? "",
  }));

  return formatTransactionsToCsv(records);
}
