import { describe, it, expect, vi } from "vitest";
import {
  createTransaction,
  decodeCursor,
  deleteTransaction,
  encodeCursor,
  listTransactions,
  restoreTransaction,
  toTransactionDto,
} from "@/server/services/transactions";

describe("Transactions Service - Cursors & DTO Mapping", () => {
  it("encodes and decodes base64url cursor", () => {
    const occurredOn = "2026-10-18";
    const id = "123e4567-e89b-12d3-a456-426614174000";

    const cursor = encodeCursor(occurredOn, id);
    expect(typeof cursor).toBe("string");

    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ occurredOn, id });
  });

  it("returns null for malformed cursors", () => {
    expect(decodeCursor("invalid-base64-random")).toBeNull();
    expect(decodeCursor("e30=")).toBeNull(); // empty object {}
  });

  it("toTransactionDto maps DB fields to DTO with numbers and ISO strings", () => {
    const now = new Date("2026-10-18T10:00:00.000Z");
    const rawTx = {
      id: "tx-1",
      userId: "user-1",
      type: "income" as const,
      amountMinor: 150000,
      currency: "PHP",
      occurredOn: "2026-10-18",
      categoryId: "cat-1",
      clientId: "client-1",
      projectId: "proj-1",
      invoiceId: null,
      recurringRuleId: null,
      description: "Milestone payment",
      notes: null,
      paymentMethod: "bank",
      receiptKey: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const category = { id: "cat-1", name: "Client work", color: "#16a34a" };
    const client = { id: "client-1", name: "Acme Corp" };
    const project = { id: "proj-1", name: "Web App" };

    const dto = toTransactionDto(rawTx, category, client, project);
    expect(dto).toEqual({
      id: "tx-1",
      type: "income",
      amountMinor: 150000,
      currency: "PHP",
      occurredOn: "2026-10-18",
      category: { id: "cat-1", name: "Client work", color: "#16a34a" },
      client: { id: "client-1", name: "Acme Corp" },
      project: { id: "proj-1", name: "Web App" },
      description: "Milestone payment",
      notes: null,
      paymentMethod: "bank",
      receiptKey: null,
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T10:00:00.000Z",
    });
  });
});

describe("Transactions Service - Integrity Validations", () => {
  const userId = "user-alice";
  const validCatId = "123e4567-e89b-12d3-a456-426614174001";
  const validClientId = "123e4567-e89b-12d3-a456-426614174002";
  const validProjectId = "123e4567-e89b-12d3-a456-426614174003";

  it("createTransaction rejects when category type does not match transaction type (422 RULE_VIOLATION)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: validCatId,
                name: "Software",
                type: "expense", // Expense category
                archivedAt: null,
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      createTransaction(
        userId,
        {
          type: "income", // Trying to create income with expense category!
          amountMinor: 50000,
          currency: "PHP",
          occurredOn: "2026-10-18",
          categoryId: validCatId,
        },
        mockDb as unknown as Parameters<typeof createTransaction>[2],
      ),
    ).rejects.toMatchObject({
      code: "RULE_VIOLATION",
      status: 422,
    });
  });

  it("createTransaction rejects when category is archived (409 CONFLICT)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: validCatId,
                name: "Old Income",
                type: "income",
                archivedAt: new Date(), // Archived!
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      createTransaction(
        userId,
        {
          type: "income",
          amountMinor: 50000,
          currency: "PHP",
          occurredOn: "2026-10-18",
          categoryId: validCatId,
        },
        mockDb as unknown as Parameters<typeof createTransaction>[2],
      ),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
    });
  });

  it("createTransaction rejects when project does not belong to specified client (422 RULE_VIOLATION)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: validCatId,
                  name: "Client work",
                  type: "income",
                  archivedAt: null,
                },
              ]) // Category
              .mockResolvedValueOnce([
                {
                  id: validClientId,
                  name: "Client A",
                  archivedAt: null,
                },
              ]) // Client
              .mockResolvedValueOnce([
                {
                  id: validProjectId,
                  name: "Project X",
                  clientId: "different-client-id", // Mismatched client!
                  archivedAt: null,
                },
              ]), // Project
          }),
        }),
      }),
    };

    await expect(
      createTransaction(
        userId,
        {
          type: "income",
          amountMinor: 50000,
          currency: "PHP",
          occurredOn: "2026-10-18",
          categoryId: validCatId,
          clientId: validClientId,
          projectId: validProjectId,
        },
        mockDb as unknown as Parameters<typeof createTransaction>[2],
      ),
    ).rejects.toMatchObject({
      code: "RULE_VIOLATION",
      status: 422,
    });
  });

  it("createTransaction auto-resolves default currency from user_settings when omitted", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([
                {
                  id: validCatId,
                  name: "Software",
                  type: "expense",
                  color: "#6366f1",
                  archivedAt: null,
                },
              ]) // Category
              .mockResolvedValueOnce([
                {
                  defaultCurrency: "PHP",
                },
              ]), // User Settings
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "tx-1",
              userId,
              type: "expense",
              amountMinor: BigInt(49900),
              currency: "PHP",
              occurredOn: "2026-10-18",
              categoryId: validCatId,
              clientId: null,
              projectId: null,
              description: null,
              notes: null,
              paymentMethod: null,
              deletedAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      }),
    };

    const res = await createTransaction(
      userId,
      {
        type: "expense",
        amountMinor: 49900,
        occurredOn: "2026-10-18",
        categoryId: validCatId,
      },
      mockDb as unknown as Parameters<typeof createTransaction>[2],
    );

    expect(res.currency).toBe("PHP");
    expect(res.amountMinor).toBe(49900);
  });
});

describe("Transactions Service - Pagination & Soft Delete", () => {
  const userId = "user-alice";
  const txId = "123e4567-e89b-12d3-a456-426614174099";

  it("listTransactions sets nextCursor when more items exist than limit", async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      tx: {
        id: `tx-${i}`,
        userId,
        type: "income" as const,
        amountMinor: 1000,
        currency: "PHP",
        occurredOn: "2026-10-18",
        categoryId: "cat-1",
        clientId: null,
        projectId: null,
        description: null,
        notes: null,
        paymentMethod: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      category: { id: "cat-1", name: "Income", color: null },
      client: { id: null, name: null },
      project: { id: null, name: null },
    }));

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(rows), // 4 rows returned for limit 3
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    const res = await listTransactions(
      userId,
      { limit: 3 },
      mockDb as unknown as Parameters<typeof listTransactions>[2],
    );

    expect(res.data).toHaveLength(3);
    expect(res.meta.nextCursor).toBeDefined();
    expect(res.meta.limit).toBe(3);
  });

  it("deleteTransaction updates deleted_at (soft delete)", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: txId }]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
    };

    await expect(
      deleteTransaction(
        userId,
        txId,
        mockDb as unknown as Parameters<typeof deleteTransaction>[2],
      ),
    ).resolves.toBeUndefined();
  });

  it("restoreTransaction rejects if deletion occurred more than 30 days ago", async () => {
    const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      tx: {
                        id: txId,
                        deletedAt: thirtyFiveDaysAgo,
                      },
                      category: { id: "cat-1", name: "Cat", color: null },
                      client: { id: null, name: null },
                      project: { id: null, name: null },
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      }),
    };

    await expect(
      restoreTransaction(
        userId,
        txId,
        mockDb as unknown as Parameters<typeof restoreTransaction>[2],
      ),
    ).rejects.toThrow(/exceeded 30 days/);
  });
});
