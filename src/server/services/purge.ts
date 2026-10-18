import { and, isNotNull, lte } from "drizzle-orm";
import { db } from "@/server/db/client";
import { transactions } from "@/server/db/schema";
import { deleteObject } from "@/server/services/storage";

export interface PurgeResult {
  purgedCount: number;
  receiptKeysDeleted: string[];
  cutoffDate: string;
}

export interface PurgeOptions {
  olderThanDays?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient?: any;
}

/**
 * Hard-deletes soft-deleted transactions older than the specified threshold (default: 30 days).
 * Also cleans up any attached receipt files in object storage to prevent orphaned files.
 */
export async function purgeSoftDeletedRows(
  options: PurgeOptions = {},
): Promise<PurgeResult> {
  const { olderThanDays = 30, dbClient = db } = options;

  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  // 1. Find all expired soft-deleted transactions to discover receipt attachments
  const expiredRows = await dbClient
    .select({
      id: transactions.id,
      receiptKey: transactions.receiptKey,
    })
    .from(transactions)
    .where(
      and(
        isNotNull(transactions.deletedAt),
        lte(transactions.deletedAt, cutoff),
      ),
    );

  const receiptKeysDeleted: string[] = [];

  // 2. Clean up any attached storage objects
  for (const row of expiredRows) {
    if (row.receiptKey) {
      await deleteObject({ key: row.receiptKey });
      receiptKeysDeleted.push(row.receiptKey);
    }
  }

  // 3. Hard delete expired rows from database
  const deletedResult = await dbClient
    .delete(transactions)
    .where(
      and(
        isNotNull(transactions.deletedAt),
        lte(transactions.deletedAt, cutoff),
      ),
    );

  // Handle both array returns (e.g. from returning()) or count properties
  const purgedCount = Array.isArray(deletedResult)
    ? deletedResult.length
    : (deletedResult?.count ?? expiredRows.length);

  return {
    purgedCount,
    receiptKeysDeleted,
    cutoffDate: cutoff.toISOString(),
  };
}
