import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  exportAccountData,
  deleteUserAccount,
} from "@/server/services/account";
import * as storageService from "@/server/services/storage";
import * as settingsService from "@/server/services/settings";
import * as categoriesService from "@/server/services/categories";
import * as clientsService from "@/server/services/clients";
import * as projectsService from "@/server/services/projects";
import * as invoicesService from "@/server/services/invoices";
import * as recurringService from "@/server/services/recurring";
import * as transactionsService from "@/server/services/transactions";
import { AppError } from "@/server/http";

describe("Account Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportAccountData", () => {
    it("compiles a complete export payload across all domains including paginated transactions", async () => {
      const mockUserRow = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      };

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUserRow]),
            }),
          }),
        }),
      };

      vi.spyOn(settingsService, "getSettings").mockResolvedValue({
        userId: "user-1",
        displayName: "Test User",
        defaultCurrency: "PHP",
        taxSetAsideBps: 1500,
        fiscalYearStartMonth: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

      vi.spyOn(categoriesService, "listCategories").mockResolvedValue([
        {
          id: "cat-1",
          name: "Design",
          type: "income",
          color: "#3b82f6",
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      vi.spyOn(clientsService, "listClients").mockResolvedValue([
        {
          id: "client-1",
          name: "Client Alpha",
          email: "alpha@example.com",
          notes: null,
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      vi.spyOn(projectsService, "listProjects").mockResolvedValue([
        {
          id: "proj-1",
          clientId: "client-1",
          name: "Website Redesign",
          archivedAt: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]);

      vi.spyOn(invoicesService, "listInvoices").mockResolvedValue({
        data: [],
        meta: { nextCursor: null, limit: 50 },
      });

      vi.spyOn(recurringService, "listRecurringRules").mockResolvedValue([]);

      const listTransactionsSpy = vi
        .spyOn(transactionsService, "listTransactions")
        .mockResolvedValueOnce({
          data: [
            {
              id: "tx-1",
              type: "income",
              amountMinor: 2500000,
              currency: "PHP",
              occurredOn: "2026-03-01",
              category: { id: "cat-1", name: "Design", color: "#3b82f6" },
              client: null,
              project: null,
              description: "Advance payment",
              notes: null,
              paymentMethod: "bank_transfer",
              receiptKey: null,
              createdAt: "2026-03-01T00:00:00.000Z",
              updatedAt: "2026-03-01T00:00:00.000Z",
            },
          ],
          meta: { nextCursor: "page-2-cursor", limit: 100 },
        })
        .mockResolvedValueOnce({
          data: [
            {
              id: "tx-2",
              type: "expense",
              amountMinor: 50000,
              currency: "PHP",
              occurredOn: "2026-03-02",
              category: { id: "cat-1", name: "Design", color: "#3b82f6" },
              client: null,
              project: null,
              description: "Software sub",
              notes: null,
              paymentMethod: "card",
              receiptKey: null,
              createdAt: "2026-03-02T00:00:00.000Z",
              updatedAt: "2026-03-02T00:00:00.000Z",
            },
          ],
          meta: { nextCursor: null, limit: 100 },
        });

      const exportResult = await exportAccountData("user-1", mockDb);

      expect(exportResult.user).toEqual({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
      expect(exportResult.categories).toHaveLength(1);
      expect(exportResult.clients).toHaveLength(1);
      expect(exportResult.projects).toHaveLength(1);
      expect(exportResult.transactions).toHaveLength(2);
      expect(listTransactionsSpy).toHaveBeenCalledTimes(2);
    });

    it("throws notFound error when user does not exist in DB", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      };

      await expect(exportAccountData("nonexistent", mockDb)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("deleteUserAccount", () => {
    it("deletes all stored receipts and removes the user record", async () => {
      const deleteObjectSpy = vi
        .spyOn(storageService, "deleteObject")
        .mockResolvedValue(true);

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: "tx-1", receiptKey: "users/u-1/receipts/rec-1.jpg" },
              { id: "tx-2", receiptKey: null },
              { id: "tx-3", receiptKey: "users/u-1/receipts/rec-2.pdf" },
            ]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ count: 1 }),
        }),
      };

      const result = await deleteUserAccount("u-1", mockDb);

      expect(deleteObjectSpy).toHaveBeenCalledTimes(2);
      expect(deleteObjectSpy).toHaveBeenCalledWith({
        key: "users/u-1/receipts/rec-1.jpg",
      });
      expect(deleteObjectSpy).toHaveBeenCalledWith({
        key: "users/u-1/receipts/rec-2.pdf",
      });
      expect(mockDb.delete).toHaveBeenCalled();
      expect(result.deleted).toBe(true);
    });
  });
});
