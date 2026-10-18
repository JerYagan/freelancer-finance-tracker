import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock import service
vi.mock("@/server/services/import", () => ({
  previewCsvTransactions: vi.fn(),
  importTransactionsFromCsv: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import {
  previewCsvTransactions,
  importTransactionsFromCsv,
} from "@/server/services/import";
import { POST as postPreviewRoute } from "@/app/api/v1/import/transactions/preview/route";
import { POST as postImportRoute } from "@/app/api/v1/import/transactions/route";

const userA = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userB = {
  id: "user-b",
  name: "User B",
  email: "userb@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Import API Routes (/api/v1/import/transactions/*)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication and Tenancy", () => {
    it("returns 401 UNAUTHORIZED when no user session exists for preview", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        "http://localhost:3000/api/v1/import/transactions/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: "Date,Amount\n2026-10-18,100",
            mapping: {
              hasHeader: true,
              dateColumn: "Date",
              amountColumn: "Amount",
            },
          }),
        },
      );

      const res = await postPreviewRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 401 UNAUTHENTICATED when no user session exists for import", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        "http://localhost:3000/api/v1/import/transactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: "Date,Amount\n2026-10-18,100",
            mapping: {
              hasHeader: true,
              dateColumn: "Date",
              amountColumn: "Amount",
            },
          }),
        },
      );

      const res = await postImportRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });

    it("enforces user tenancy on preview route (passes authenticated userId)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(previewCsvTransactions).mockResolvedValue({
        totalRows: 1,
        validCount: 1,
        errorCount: 0,
        headers: ["Date", "Amount"],
        preview: [],
      });

      const req = new Request(
        "http://localhost:3000/api/v1/import/transactions/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: "Date,Amount\n2026-10-18,100",
            mapping: {
              hasHeader: true,
              dateColumn: "Date",
              amountColumn: "Amount",
            },
          }),
        },
      );

      const res = await postPreviewRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      expect(previewCsvTransactions).toHaveBeenCalledWith(
        "user-a",
        expect.objectContaining({
          csvText: "Date,Amount\n2026-10-18,100",
        }),
      );
    });

    it("enforces user tenancy on import route (passes authenticated userId)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(importTransactionsFromCsv).mockResolvedValue({
        importedCount: 1,
        skippedCount: 0,
        transactions: [],
      });

      const req = new Request(
        "http://localhost:3000/api/v1/import/transactions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: "Date,Amount\n2026-10-18,100",
            mapping: {
              hasHeader: true,
              dateColumn: "Date",
              amountColumn: "Amount",
            },
            skipInvalid: true,
          }),
        },
      );

      const res = await postImportRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(200);
      expect(importTransactionsFromCsv).toHaveBeenCalledWith(
        "user-b",
        expect.objectContaining({
          csvText: "Date,Amount\n2026-10-18,100",
          skipInvalid: true,
        }),
      );
    });
  });

  describe("Validation", () => {
    it("returns 400 VALIDATION_ERROR when missing required column mappings", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        "http://localhost:3000/api/v1/import/transactions/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csvText: "Date,Amount\n2026-10-18,100",
            mapping: {
              // Missing dateColumn and amountColumn
              hasHeader: true,
            },
          }),
        },
      );

      const res = await postPreviewRoute(req, { params: Promise.resolve({}) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
