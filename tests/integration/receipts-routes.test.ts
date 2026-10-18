import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock receipts service
vi.mock("@/server/services/receipts", () => ({
  requestReceiptUpload: vi.fn(),
  getReceiptDownloadUrl: vi.fn(),
  deleteReceipt: vi.fn(),
}));

import { getSessionUser, type User } from "@/server/auth";
import {
  requestReceiptUpload,
  getReceiptDownloadUrl,
  deleteReceipt,
} from "@/server/services/receipts";
import {
  POST as postReceipt,
  GET as getReceipt,
  DELETE as deleteReceiptRoute,
} from "@/app/api/v1/transactions/[id]/receipt/route";
import { AppError } from "@/server/http";

const userA: User = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validTxId = "550e8400-e29b-41d4-a716-446655440000";

describe("Receipts Route Handlers Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/transactions/:id/receipt", () => {
    it("returns 401 UNAUTHENTICATED when not logged in", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "receipt.jpg",
            contentType: "image/jpeg",
            fileSizeBytes: 2048,
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 400 BAD_REQUEST when transaction ID is not a valid UUID", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        "http://localhost:3000/api/v1/transactions/not-a-uuid/receipt",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "receipt.jpg",
            contentType: "image/jpeg",
            fileSizeBytes: 2048,
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: "not-a-uuid" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when file size exceeds 10MB limit", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "large-video.mp4",
            contentType: "image/jpeg",
            fileSizeBytes: 15 * 1024 * 1024, // 15MB
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when content type is not allowed", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "script.sh",
            contentType: "application/x-sh",
            fileSizeBytes: 1024,
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 422 RULE_VIOLATION when transaction is an income", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(requestReceiptUpload).mockRejectedValue(
        AppError.ruleViolation(
          "Receipt attachments are only supported on expense transactions",
        ),
      );

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "invoice.pdf",
            contentType: "application/pdf",
            fileSizeBytes: 1024,
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(422);
      const json = await res.json();
      expect(json.error.code).toBe("RULE_VIOLATION");
    });

    it("returns 200 with presigned upload URL on valid request", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(requestReceiptUpload).mockResolvedValue({
        transactionId: validTxId,
        receiptKey: "users/user-a/receipts/rec-123.jpg",
        uploadUrl: "https://bucket.s3.region.amazonaws.com/...",
        expiresInSeconds: 900,
        headers: { "Content-Type": "image/jpeg" },
      });

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "receipt.jpg",
            contentType: "image/jpeg",
            fileSizeBytes: 2048,
          }),
        },
      );

      const res = await postReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.receiptKey).toBe("users/user-a/receipts/rec-123.jpg");
      expect(json.data.uploadUrl).toBeDefined();
    });
  });

  describe("GET /api/v1/transactions/:id/receipt", () => {
    it("returns 401 UNAUTHENTICATED when not logged in", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "GET",
        },
      );

      const res = await getReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 404 NOT_FOUND when receipt does not exist", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(getReceiptDownloadUrl).mockRejectedValue(
        AppError.notFound("No receipt attached to this transaction"),
      );

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "GET",
        },
      );

      const res = await getReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 200 with downloadUrl for valid transaction with receipt", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(getReceiptDownloadUrl).mockResolvedValue({
        transactionId: validTxId,
        receiptKey: "users/user-a/receipts/rec-123.jpg",
        downloadUrl: "https://bucket.s3.region.amazonaws.com/download-receipt",
        expiresInSeconds: 900,
      });

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "GET",
        },
      );

      const res = await getReceipt(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.downloadUrl).toBe(
        "https://bucket.s3.region.amazonaws.com/download-receipt",
      );
    });
  });

  describe("DELETE /api/v1/transactions/:id/receipt", () => {
    it("returns 401 UNAUTHENTICATED when not logged in", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "DELETE",
        },
      );

      const res = await deleteReceiptRoute(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(401);
    });

    it("returns 200 with deleted: true on successful deletion", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(deleteReceipt).mockResolvedValue({
        transactionId: validTxId,
        deleted: true,
      });

      const req = new Request(
        `http://localhost:3000/api/v1/transactions/${validTxId}/receipt`,
        {
          method: "DELETE",
        },
      );

      const res = await deleteReceiptRoute(req, {
        params: Promise.resolve({ id: validTxId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(true);
    });
  });
});
