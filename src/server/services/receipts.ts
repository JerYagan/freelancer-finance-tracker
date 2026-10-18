import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import {
  type ReceiptUploadRequestInput,
  type ReceiptUploadResponseDto,
  type ReceiptDownloadResponseDto,
} from "@/lib/schemas/receipts";
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  deleteObject,
} from "@/server/services/storage";

/**
 * Maps content type to safe file extension.
 */
function getExtensionForContentType(
  contentType: string,
  fileName: string,
): string {
  const extFromName = fileName.split(".").pop()?.toLowerCase();
  if (contentType === "image/jpeg") {
    return extFromName === "jpeg" ? "jpeg" : "jpg";
  }
  if (contentType === "image/png") return "png";
  if (contentType === "application/pdf") return "pdf";
  return "bin";
}

/**
 * Requests a presigned PUT URL to upload an expense receipt.
 * Validates ownership, ensures transaction is an expense,
 * generates scoped key users/{userId}/receipts/{uuid}.{ext}, and updates transaction.receiptKey.
 */
export async function requestReceiptUpload(
  userId: string,
  transactionId: string,
  input: ReceiptUploadRequestInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = db,
): Promise<ReceiptUploadResponseDto> {
  // Check transaction ownership and existence
  const existing = await dbClient
    .select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      receiptKey: transactions.receiptKey,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  const tx = existing[0];
  if (!tx) {
    throw AppError.notFound("Transaction not found");
  }

  if (tx.type !== "expense") {
    throw AppError.ruleViolation(
      "Receipt attachments are only supported on expense transactions",
    );
  }

  // Generate scoped receipt key per SECURITY.md: users/{userId}/receipts/{uuid}
  const receiptUuid = crypto.randomUUID();
  const ext = getExtensionForContentType(input.contentType, input.fileName);
  const storageKey = `users/${userId}/receipts/${receiptUuid}.${ext}`;

  // If there was an existing receipt, clean up old object in background
  if (tx.receiptKey && tx.receiptKey !== storageKey) {
    void deleteObject({ key: tx.receiptKey });
  }

  const { uploadUrl, expiresInSeconds, headers } =
    await createPresignedUploadUrl({
      key: storageKey,
      contentType: input.contentType,
      expiresInSeconds: 900,
    });

  // Persist receipt key on transaction
  await dbClient
    .update(transactions)
    .set({
      receiptKey: storageKey,
      updatedAt: new Date(),
    })
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    );

  return {
    transactionId,
    receiptKey: storageKey,
    uploadUrl,
    expiresInSeconds,
    headers,
  };
}

/**
 * Retrieves a presigned GET / download URL for an attached receipt.
 */
export async function getReceiptDownloadUrl(
  userId: string,
  transactionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = db,
): Promise<ReceiptDownloadResponseDto> {
  const existing = await dbClient
    .select({
      id: transactions.id,
      userId: transactions.userId,
      receiptKey: transactions.receiptKey,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  const tx = existing[0];
  if (!tx) {
    throw AppError.notFound("Transaction not found");
  }

  if (!tx.receiptKey) {
    throw AppError.notFound("No receipt attached to this transaction");
  }

  const { downloadUrl, expiresInSeconds } = await createPresignedDownloadUrl({
    key: tx.receiptKey,
    expiresInSeconds: 900,
  });

  return {
    transactionId,
    receiptKey: tx.receiptKey,
    downloadUrl,
    expiresInSeconds,
  };
}

/**
 * Removes the receipt attachment from the transaction and deletes the object from storage.
 */
export async function deleteReceipt(
  userId: string,
  transactionId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any = db,
): Promise<{ transactionId: string; deleted: boolean }> {
  const existing = await dbClient
    .select({
      id: transactions.id,
      userId: transactions.userId,
      receiptKey: transactions.receiptKey,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);

  const tx = existing[0];
  if (!tx) {
    throw AppError.notFound("Transaction not found");
  }

  if (!tx.receiptKey) {
    throw AppError.notFound("No receipt attached to this transaction");
  }

  await deleteObject({ key: tx.receiptKey });

  await dbClient
    .update(transactions)
    .set({
      receiptKey: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(transactions.id, transactionId), eq(transactions.userId, userId)),
    );

  return {
    transactionId,
    deleted: true,
  };
}
