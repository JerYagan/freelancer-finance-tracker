import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRecurringRule,
  deleteRecurringRule,
  generateDueRecurringTransactions,
  getRecurringRuleById,
  listRecurringRules,
  updateRecurringRule,
} from "@/server/services/recurring";
import { AppError } from "@/server/http";

type DbClient = Parameters<typeof createRecurringRule>[2];

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

describe("Recurring Rules Service", () => {
  const userId = "user-1";
  const validCatId = "123e4567-e89b-12d3-a456-426614174001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listRecurringRules", () => {
    it("returns hydrated recurring rules for user", async () => {
      const mockRule = {
        id: "rule-1",
        userId,
        interval: "monthly" as const,
        nextRunOn: "2026-11-01",
        endsOn: null,
        active: true,
        template: {
          type: "expense" as const,
          amountMinor: 50000,
          currency: "PHP",
          categoryId: validCatId,
          clientId: null,
          projectId: null,
          description: "SaaS Subscription",
          paymentMethod: null,
          notes: null,
        },
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
      };

      // When hydrating, it calls select again for categories
      let selectCount = 0;
      const mockClientWithHydrate = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => {
              selectCount++;
              if (selectCount === 1) {
                return {
                  orderBy: vi.fn(() => Promise.resolve([mockRule])),
                };
              }
              return Promise.resolve([
                {
                  id: validCatId,
                  name: "Software",
                  color: "#6366f1",
                },
              ]);
            }),
          })),
        })),
      } as unknown as DbClient;

      const result = await listRecurringRules(
        userId,
        { active: true },
        mockClientWithHydrate,
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("rule-1");
      expect(result[0]?.category.name).toBe("Software");
    });
  });

  describe("createRecurringRule", () => {
    it("creates a recurring rule when referential integrity checks pass", async () => {
      const mockCreated = {
        id: "rule-1",
        userId,
        interval: "monthly" as const,
        nextRunOn: "2026-11-01",
        endsOn: "2027-11-01",
        active: true,
        template: {
          type: "expense" as const,
          amountMinor: 50000,
          currency: "PHP",
          categoryId: validCatId,
          clientId: null,
          projectId: null,
          description: "SaaS Subscription",
          paymentMethod: null,
          notes: null,
        },
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
      };

      const mockCategory = {
        id: validCatId,
        name: "Software",
        color: "#6366f1",
        type: "expense",
        archivedAt: null,
      };

      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => createQueryMock([mockCategory])),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([mockCreated])),
          })),
        })),
      } as unknown as DbClient;

      const result = await createRecurringRule(
        userId,
        {
          interval: "monthly",
          nextRunOn: "2026-11-01",
          endsOn: "2027-11-01",
          template: {
            type: "expense",
            amountMinor: 50000,
            currency: "PHP",
            categoryId: validCatId,
            description: "SaaS Subscription",
          },
        },
        mockClient,
      );

      expect(result.id).toBe("rule-1");
      expect(result.interval).toBe("monthly");
      expect(result.template.amountMinor).toBe(50000);
      expect(result.category.name).toBe("Software");
    });

    it("rejects recurring rule if category does not exist", async () => {
      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        createRecurringRule(
          userId,
          {
            interval: "monthly",
            nextRunOn: "2026-11-01",
            template: {
              type: "expense",
              amountMinor: 50000,
              categoryId: validCatId,
            },
          },
          mockClient,
        ),
      ).rejects.toThrowError(AppError);
    });

    it("rejects recurring rule if category is archived", async () => {
      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: validCatId,
                    userId,
                    name: "Old Category",
                    type: "expense",
                    archivedAt: new Date(),
                  },
                ]),
              ),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        createRecurringRule(
          userId,
          {
            interval: "monthly",
            nextRunOn: "2026-11-01",
            template: {
              type: "expense",
              amountMinor: 50000,
              categoryId: validCatId,
            },
          },
          mockClient,
        ),
      ).rejects.toThrowError(AppError);
    });

    it("rejects recurring rule if category type mismatches template type", async () => {
      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: validCatId,
                    userId,
                    name: "Income Category",
                    type: "income",
                    archivedAt: null,
                  },
                ]),
              ),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        createRecurringRule(
          userId,
          {
            interval: "monthly",
            nextRunOn: "2026-11-01",
            template: {
              type: "expense",
              amountMinor: 50000,
              categoryId: validCatId,
            },
          },
          mockClient,
        ),
      ).rejects.toThrowError(AppError);
    });
  });

  describe("updateRecurringRule", () => {
    it("updates recurring rule fields and validates endsOn", async () => {
      const mockExisting = {
        id: "rule-1",
        userId,
        interval: "monthly" as const,
        nextRunOn: "2026-11-01",
        endsOn: null,
        active: true,
        template: {
          type: "expense" as const,
          amountMinor: 50000,
          currency: "PHP",
          categoryId: validCatId,
          clientId: null,
          projectId: null,
          description: "Software",
          paymentMethod: null,
          notes: null,
        },
        createdAt: new Date("2026-10-18T10:00:00Z"),
        updatedAt: new Date("2026-10-18T10:00:00Z"),
      };

      const mockUpdated = {
        ...mockExisting,
        active: false,
      };

      const mockCategory = {
        id: validCatId,
        name: "Software",
        color: "#6366f1",
      };

      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => createQueryMock([mockExisting], [mockCategory])),
          })),
        })),
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve([mockUpdated])),
            })),
          })),
        })),
      } as unknown as DbClient;

      const result = await updateRecurringRule(
        userId,
        "rule-1",
        { active: false },
        mockClient,
      );

      expect(result.active).toBe(false);
    });
  });

  describe("getRecurringRuleById & deleteRecurringRule", () => {
    it("throws not found when rule does not exist", async () => {
      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as unknown as DbClient;

      await expect(
        getRecurringRuleById(userId, "non-existent-rule", mockClient),
      ).rejects.toThrowError(AppError);

      await expect(
        deleteRecurringRule(userId, "non-existent-rule", mockClient),
      ).rejects.toThrowError(AppError);
    });

    it("deletes recurring rule successfully", async () => {
      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{ id: "rule-1" }])),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      } as unknown as DbClient;

      const result = await deleteRecurringRule(userId, "rule-1", mockClient);
      expect(result).toEqual({ id: "rule-1", deleted: true });
    });
  });

  describe("generateDueRecurringTransactions", () => {
    it("generates transactions for active rules and advances nextRunOn", async () => {
      const mockRule = {
        id: "rule-1",
        userId,
        interval: "monthly" as const,
        nextRunOn: "2026-10-01",
        endsOn: "2026-12-01",
        active: true,
        template: {
          type: "expense" as const,
          amountMinor: 25000,
          currency: "PHP",
          categoryId: validCatId,
          clientId: null,
          projectId: null,
          description: "Monthly Internet",
          paymentMethod: null,
          notes: null,
        },
      };

      const updateSpy = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      }));

      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([mockRule])),
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: validCatId,
                    name: "Internet",
                    type: "expense",
                    archivedAt: null,
                    color: null,
                  },
                ]),
              ),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([
                {
                  id: "tx-generated-1",
                  userId,
                  type: "expense",
                  amountMinor: 25000,
                  currency: "PHP",
                  occurredOn: "2026-10-01",
                  categoryId: validCatId,
                  clientId: null,
                  projectId: null,
                  invoiceId: null,
                  recurringRuleId: "rule-1",
                  description: "Monthly Internet",
                  notes: null,
                  paymentMethod: null,
                  createdAt: new Date("2026-10-18T10:00:00Z"),
                  updatedAt: new Date("2026-10-18T10:00:00Z"),
                },
              ]),
            ),
          })),
        })),
        update: updateSpy,
      } as unknown as DbClient;

      const result = await generateDueRecurringTransactions(
        userId,
        "2026-10-18",
        mockClient,
      );

      expect(result.generatedCount).toBe(1);
      expect(result.transactions[0]?.occurredOn).toBe("2026-10-01");
      expect(result.transactions[0]?.amountMinor).toBe(25000);
      expect(updateSpy).toHaveBeenCalled();
    });

    it("deactivates rule when advanced date passes endsOn", async () => {
      const mockRule = {
        id: "rule-ending",
        userId,
        interval: "weekly" as const,
        nextRunOn: "2026-10-10",
        endsOn: "2026-10-15", // After +7 days, next date 2026-10-17 > 2026-10-15 -> deactivates!
        active: true,
        template: {
          type: "income" as const,
          amountMinor: 100000,
          currency: "PHP",
          categoryId: validCatId,
          clientId: null,
          projectId: null,
          description: "Weekly Consulting",
          paymentMethod: null,
          notes: null,
        },
      };

      const updateSetSpy = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      }));

      const mockClient = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(() => Promise.resolve([mockRule])),
              limit: vi.fn(() =>
                Promise.resolve([
                  {
                    id: validCatId,
                    name: "Consulting",
                    type: "income",
                    archivedAt: null,
                    color: null,
                  },
                ]),
              ),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(() => ({
            returning: vi.fn(() =>
              Promise.resolve([
                {
                  id: "tx-generated-2",
                  userId,
                  type: "income",
                  amountMinor: 100000,
                  currency: "PHP",
                  occurredOn: "2026-10-10",
                  categoryId: validCatId,
                  clientId: null,
                  projectId: null,
                  invoiceId: null,
                  recurringRuleId: "rule-ending",
                  description: "Weekly Consulting",
                  notes: null,
                  paymentMethod: null,
                  createdAt: new Date("2026-10-18T10:00:00Z"),
                  updatedAt: new Date("2026-10-18T10:00:00Z"),
                },
              ]),
            ),
          })),
        })),
        update: vi.fn(() => ({
          set: updateSetSpy,
        })),
      } as unknown as DbClient;

      const result = await generateDueRecurringTransactions(
        userId,
        "2026-10-18",
        mockClient,
      );

      expect(result.generatedCount).toBe(1);
      expect(updateSetSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          nextRunOn: "2026-10-17",
          active: false,
        }),
      );
    });
  });
});
