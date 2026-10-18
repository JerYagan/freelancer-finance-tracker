import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requestReceiptUpload,
  getReceiptDownloadUrl,
  deleteReceipt,
} from "@/server/services/receipts";
import { AppError } from "@/server/http";

function createMockDb(rows: unknown[]) {
  const updateSetMock = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ id: "tx-1" }]),
  });

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: updateSetMock,
    }),
  };
}

describe("Receipts Service Unit Tests", () => {
  const userId = "user-1";
  const expenseTxId = "550e8400-e29b-41d4-a716-446655440001";
  const incomeTxId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestReceiptUpload", () => {
    it("throws NOT_FOUND when transaction does not exist or belongs to another user", async () => {
      const mockDb = createMockDb([]);

      await expect(
        requestReceiptUpload(
          userId,
          expenseTxId,
          {
            fileName: "receipt.jpg",
            contentType: "image/jpeg",
            fileSizeBytes: 1024,
          },
          mockDb,
        ),
      ).rejects.toThrow(AppError);
    });

    it("throws RULE_VIOLATION when transaction is an income", async () => {
      const mockDb = createMockDb([
        {
          id: incomeTxId,
          userId,
          type: "income",
          receiptKey: null,
        },
      ]);

      await expect(
        requestReceiptUpload(
          userId,
          incomeTxId,
          {
            fileName: "invoice.pdf",
            contentType: "application/pdf",
            fileSizeBytes: 2048,
          },
          mockDb,
        ),
      ).rejects.toThrow(
        "Receipt attachments are only supported on expense transactions",
      );
    });

    it("creates presigned upload URL and updates receiptKey for expense transaction", async () => {
      const mockDb = createMockDb([
        {
          id: expenseTxId,
          userId,
          type: "expense",
          receiptKey: null,
        },
      ]);

      const result = await requestReceiptUpload(
        userId,
        expenseTxId,
        {
          fileName: "hotel-bill.png",
          contentType: "image/png",
          fileSizeBytes: 50000,
        },
        mockDb,
      );

      expect(result.transactionId).toBe(expenseTxId);
      expect(result.receiptKey).toMatch(
        /^users\/user-1\/receipts\/[0-9a-f-]+\.png$/,
      );
      expect(result.uploadUrl).toBeDefined();
      expect(result.headers?.["Content-Type"]).toBe("image/png");
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("getReceiptDownloadUrl", () => {
    it("throws NOT_FOUND if transaction does not exist", async () => {
      const mockDb = createMockDb([]);

      await expect(
        getReceiptDownloadUrl(userId, expenseTxId, mockDb),
      ).rejects.toThrow(AppError);
    });

    it("throws NOT_FOUND if transaction has no receipt attached", async () => {
      const mockDb = createMockDb([
        {
          id: expenseTxId,
          userId,
          receiptKey: null,
        },
      ]);

      await expect(
        getReceiptDownloadUrl(userId, expenseTxId, mockDb),
      ).rejects.toThrow("No receipt attached to this transaction");
    });

    it("returns presigned download URL for transaction with receipt", async () => {
      const mockDb = createMockDb([
        {
          id: expenseTxId,
          userId,
          receiptKey: "users/user-1/receipts/test-receipt.pdf",
        },
      ]);

      const result = await getReceiptDownloadUrl(userId, expenseTxId, mockDb);
      expect(result.transactionId).toBe(expenseTxId);
      expect(result.receiptKey).toBe("users/user-1/receipts/test-receipt.pdf");
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe("deleteReceipt", () => {
    it("throws NOT_FOUND if transaction has no receipt attached", async () => {
      const mockDb = createMockDb([
        {
          id: expenseTxId,
          userId,
          receiptKey: null,
        },
      ]);

      await expect(deleteReceipt(userId, expenseTxId, mockDb)).rejects.toThrow(
        "No receipt attached to this transaction",
      );
    });

    it("deletes object and sets receiptKey to null", async () => {
      const mockDb = createMockDb([
        {
          id: expenseTxId,
          userId,
          receiptKey: "users/user-1/receipts/old.jpg",
        },
      ]);

      const result = await deleteReceipt(userId, expenseTxId, mockDb);
      expect(result.transactionId).toBe(expenseTxId);
      expect(result.deleted).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
