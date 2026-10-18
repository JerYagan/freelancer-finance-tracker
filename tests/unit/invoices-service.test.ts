import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInvoice,
  deleteInvoice,
  deriveInvoiceStatus,
  decodeInvoiceCursor,
  encodeInvoiceCursor,
  getInvoiceById,
  markInvoicePaid,
  toInvoiceDto,
  updateInvoice,
} from "@/server/services/invoices";
import { AppError } from "@/server/http";
import { categories, clients } from "@/server/db/schema";

type DbClient = Parameters<typeof createInvoice>[2];

function createQueryMock(
  valueWithLimit: unknown[],
  valueDirect: unknown[] = valueWithLimit,
) {
  return {
    limit: vi.fn(() => Promise.resolve(valueWithLimit)),
    orderBy: vi.fn(() => Promise.resolve(valueWithLimit)),
    then<TResult1 = unknown[], TResult2 = never>(
      onfulfilled?:
        ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(valueDirect).then(onfulfilled, onrejected);
    },
  };
}

describe("Invoices Service", () => {
  const userId = "user-1";
  const validClientId = "123e4567-e89b-12d3-a456-426614174001";
  const validCatId = "123e4567-e89b-12d3-a456-426614174002";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("deriveInvoiceStatus", () => {
    it("derives overdue when status is sent and dueOn is before today", () => {
      expect(deriveInvoiceStatus("sent", "2026-10-15", "2026-10-18")).toBe(
        "overdue",
      );
    });

    it("keeps sent status when dueOn is on or after today", () => {
      expect(deriveInvoiceStatus("sent", "2026-10-18", "2026-10-18")).toBe(
        "sent",
      );
      expect(deriveInvoiceStatus("sent", "2026-10-25", "2026-10-18")).toBe(
        "sent",
      );
    });

    it("does not derive overdue for draft, paid, or void invoices even if dueOn is past", () => {
      expect(deriveInvoiceStatus("draft", "2026-10-15", "2026-10-18")).toBe(
        "draft",
      );
      expect(deriveInvoiceStatus("paid", "2026-10-15", "2026-10-18")).toBe(
        "paid",
      );
      expect(deriveInvoiceStatus("void", "2026-10-15", "2026-10-18")).toBe(
        "void",
      );
    });
  });

  describe("Cursors & DTO Mapping", () => {
    it("encodes and decodes base64url invoice cursor", () => {
      const issuedOn = "2026-10-18";
      const id = "123e4567-e89b-12d3-a456-426614174000";

      const cursor = encodeInvoiceCursor(issuedOn, id);
      expect(typeof cursor).toBe("string");

      const decoded = decodeInvoiceCursor(cursor);
      expect(decoded).toEqual({ issuedOn, id });
    });

    it("returns null for invalid invoice cursors", () => {
      expect(decodeInvoiceCursor("invalid")).toBeNull();
      expect(decodeInvoiceCursor("e30=")).toBeNull();
    });

    it("toInvoiceDto maps DB fields to DTO with derived status", () => {
      const now = new Date("2026-10-18T10:00:00Z");
      const rawInv = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        projectId: null,
        categoryId: null,
        number: "INV-2026-001",
        amountMinor: 2500000,
        currency: "PHP",
        issuedOn: "2026-10-01",
        dueOn: "2026-10-15", // past dueOn
        paidOn: null,
        status: "sent" as const,
        notes: "Net 14",
        createdAt: now,
        updatedAt: now,
      };

      const client = { id: validClientId, name: "Acme Corp" };

      const dto = toInvoiceDto(rawInv, client, null, null, "2026-10-18");
      expect(dto.id).toBe("inv-1");
      expect(dto.status).toBe("sent");
      expect(dto.derivedStatus).toBe("overdue");
      expect(dto.amountMinor).toBe(2500000);
      expect(dto.client.name).toBe("Acme Corp");
    });
  });

  describe("createInvoice", () => {
    it("creates invoice when validations pass", async () => {
      const mockClientData = {
        id: validClientId,
        name: "Acme Corp",
        archivedAt: null,
      };

      const mockCreated = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        projectId: null,
        categoryId: null,
        number: "INV-2026-001",
        amountMinor: 2500000,
        currency: "PHP",
        issuedOn: "2026-10-18",
        dueOn: "2026-11-01",
        paidOn: null,
        status: "draft" as const,
        notes: null,
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
      };

      let selectCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCount++;
              if (selectCount === 1) {
                // Client lookup
                return createQueryMock([mockClientData]);
              }
              // Duplicate number check -> empty
              return createQueryMock([]);
            }),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([mockCreated])),
          })),
        })),
      } as unknown as DbClient;

      const result = await createInvoice(
        userId,
        {
          clientId: validClientId,
          number: "INV-2026-001",
          amountMinor: 2500000,
          currency: "PHP",
          issuedOn: "2026-10-18",
          dueOn: "2026-11-01",
        },
        mockDb,
      );

      expect(result.id).toBe("inv-1");
      expect(result.number).toBe("INV-2026-001");
      expect(result.amountMinor).toBe(2500000);
    });

    it("rejects when client is archived (409 CONFLICT)", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() =>
              createQueryMock([
                {
                  id: validClientId,
                  name: "Old Client",
                  archivedAt: new Date(),
                },
              ]),
            ),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        createInvoice(
          userId,
          {
            clientId: validClientId,
            number: "INV-2026-001",
            amountMinor: 2500000,
            issuedOn: "2026-10-18",
            dueOn: "2026-11-01",
          },
          mockDb,
        ),
      ).rejects.toThrowError(AppError);
    });

    it("rejects when category is not income type (422 RULE_VIOLATION)", async () => {
      let selectCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCount++;
              if (selectCount === 1) {
                return createQueryMock([
                  {
                    id: validClientId,
                    name: "Client",
                    archivedAt: null,
                  },
                ]);
              }
              // Category lookup -> expense type
              return createQueryMock([
                {
                  id: validCatId,
                  name: "Hosting",
                  type: "expense",
                  archivedAt: null,
                },
              ]);
            }),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        createInvoice(
          userId,
          {
            clientId: validClientId,
            categoryId: validCatId,
            number: "INV-2026-001",
            amountMinor: 2500000,
            issuedOn: "2026-10-18",
            dueOn: "2026-11-01",
          },
          mockDb,
        ),
      ).rejects.toThrowError(AppError);
    });
  });

  describe("updateInvoice & getInvoiceById", () => {
    it("throws not found when invoice does not exist", async () => {
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve([])),
                  })),
                })),
              })),
            })),
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        getInvoiceById(userId, "non-existent", mockDb),
      ).rejects.toThrowError(AppError);

      await expect(
        updateInvoice(userId, "non-existent", { status: "sent" }, mockDb),
      ).rejects.toThrowError(AppError);
    });
  });

  describe("markInvoicePaid", () => {
    it("marks invoice as paid and generates income transaction", async () => {
      const mockExisting = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        projectId: null,
        categoryId: validCatId,
        number: "INV-2026-001",
        amountMinor: 2500000,
        currency: "PHP",
        issuedOn: "2026-10-18",
        dueOn: "2026-11-01",
        paidOn: null,
        status: "sent" as const,
        notes: null,
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
      };

      const mockClient = {
        id: validClientId,
        name: "Acme Corp",
        archivedAt: null,
      };
      const mockCategory = {
        id: validCatId,
        name: "Client work",
        type: "income",
        archivedAt: null,
        color: null,
      };

      const updateSpy = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      }));

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn((table: unknown) => ({
            innerJoin: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    limit: vi.fn(() =>
                      Promise.resolve([
                        {
                          inv: {
                            ...mockExisting,
                            status: "paid",
                            paidOn: "2026-10-18",
                          },
                          client: mockClient,
                          project: null,
                          category: mockCategory,
                        },
                      ]),
                    ),
                  })),
                })),
              })),
            })),
            where: vi.fn(() => ({
              limit: vi.fn(() => {
                if (table === categories) {
                  return Promise.resolve([mockCategory]);
                }
                if (table === clients) {
                  return Promise.resolve([mockClient]);
                }
                return Promise.resolve([mockExisting]);
              }),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([
                {
                  id: "tx-income-1",
                  userId,
                  type: "income",
                  amountMinor: 2500000,
                  currency: "PHP",
                  occurredOn: "2026-10-18",
                  categoryId: validCatId,
                  clientId: validClientId,
                  projectId: null,
                  invoiceId: "inv-1",
                  recurringRuleId: null,
                  description: "Payment for Invoice INV-2026-001",
                  notes: null,
                  paymentMethod: "bank",
                  createdAt: new Date("2026-10-18T10:00:00Z"),
                  updatedAt: new Date("2026-10-18T10:00:00Z"),
                },
              ]),
            ),
          })),
        })),
        update: updateSpy,
      } as unknown as DbClient;

      const result = await markInvoicePaid(
        userId,
        "inv-1",
        { paidOn: "2026-10-18" },
        mockDb,
      );

      expect(result.status).toBe("paid");
      expect(result.paidOn).toBe("2026-10-18");
      expect(updateSpy).toHaveBeenCalled();
    });

    it("rejects marking an already paid invoice as paid (409 CONFLICT)", async () => {
      const mockPaid = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        status: "paid" as const,
      };

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([mockPaid])),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        markInvoicePaid(userId, "inv-1", {}, mockDb),
      ).rejects.toThrowError(AppError);
    });
  });

  describe("deleteInvoice", () => {
    it("rejects deleting a paid invoice (409 CONFLICT)", async () => {
      const mockPaid = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        status: "paid" as const,
      };

      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([mockPaid])),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(deleteInvoice(userId, "inv-1", mockDb)).rejects.toThrowError(
        AppError,
      );
    });

    it("rejects deleting an invoice that has associated transactions (409 CONFLICT)", async () => {
      const mockDraft = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        status: "draft" as const,
      };

      let selectCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCount++;
              if (selectCount === 1) {
                return { limit: vi.fn(() => Promise.resolve([mockDraft])) };
              }
              // Transaction exists!
              return { limit: vi.fn(() => Promise.resolve([{ id: "tx-1" }])) };
            }),
          })),
        })),
      } as unknown as DbClient;

      await expect(deleteInvoice(userId, "inv-1", mockDb)).rejects.toThrowError(
        AppError,
      );
    });

    it("deletes invoice when not paid and no transactions linked", async () => {
      const mockDraft = {
        id: "inv-1",
        userId,
        clientId: validClientId,
        status: "draft" as const,
      };

      let selectCount = 0;
      const mockDb = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCount++;
              if (selectCount === 1) {
                return { limit: vi.fn(() => Promise.resolve([mockDraft])) };
              }
              // No transactions
              return { limit: vi.fn(() => Promise.resolve([])) };
            }),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      } as unknown as DbClient;

      const result = await deleteInvoice(userId, "inv-1", mockDb);
      expect(result).toEqual({ id: "inv-1", deleted: true });
    });
  });
});
