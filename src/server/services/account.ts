import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { user, transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import type { AccountExportDto } from "@/lib/schemas/account";
import { getSettings } from "@/server/services/settings";
import { listCategories } from "@/server/services/categories";
import { listClients } from "@/server/services/clients";
import { listProjects } from "@/server/services/projects";
import { listInvoices } from "@/server/services/invoices";
import { listRecurringRules } from "@/server/services/recurring";
import { listTransactions } from "@/server/services/transactions";
import { deleteObject } from "@/server/services/storage";

/**
 * Compiles a comprehensive export of all user entities for GDPR/portability compliance.
 */
export async function exportAccountData(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = db,
): Promise<AccountExportDto> {
  const userRows = await dbClient
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const userProfile = userRows[0];
  if (!userProfile) {
    throw AppError.notFound("User account not found");
  }

  // Fetch all user records in parallel
  const [settings, categories, clients, projects, recurringRules] =
    await Promise.all([
      getSettings(userId, dbClient),
      listCategories(userId, dbClient),
      listClients(userId, dbClient),
      listProjects(userId, dbClient),
      listRecurringRules(userId, dbClient),
    ]);

  // Fetch all invoices across all pages
  const allInvoices = [];
  let invoiceCursor: string | undefined = undefined;
  while (true) {
    const page = await listInvoices(
      userId,
      { limit: 100, cursor: invoiceCursor },
      dbClient,
    );
    allInvoices.push(...page.data);
    if (!page.meta.nextCursor) break;
    invoiceCursor = page.meta.nextCursor;
  }

  // Fetch all transactions across all pages
  const allTransactions = [];
  let txCursor: string | undefined = undefined;
  while (true) {
    const page = await listTransactions(
      userId,
      { limit: 100, cursor: txCursor },
      dbClient,
    );
    allTransactions.push(...page.data);
    if (!page.meta.nextCursor) break;
    txCursor = page.meta.nextCursor;
  }

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      createdAt: userProfile.createdAt.toISOString(),
    },
    settings,
    categories,
    clients,
    projects,
    invoices: allInvoices,
    recurringRules,
    transactions: allTransactions,
  };
}

/**
 * Permanently deletes a user's account.
 * Cleans up all storage objects and cascades deletion across all database tables.
 */
export async function deleteUserAccount(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = db,
): Promise<{ deleted: boolean }> {
  // 1. Find all receipt keys belonging to user
  const userTxRows = await dbClient
    .select({
      id: transactions.id,
      receiptKey: transactions.receiptKey,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  for (const row of userTxRows) {
    if (row.receiptKey) {
      await deleteObject({ key: row.receiptKey });
    }
  }

  // 2. Delete user row (cascades to userSettings, categories, clients, projects, invoices, recurring, transactions, sessions, accounts)
  const deleteResult = await dbClient.delete(user).where(eq(user.id, userId));

  const deleted = Array.isArray(deleteResult)
    ? deleteResult.length > 0
    : (deleteResult?.count ?? 1) > 0;

  return { deleted };
}
