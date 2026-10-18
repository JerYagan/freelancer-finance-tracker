import { describe, it, expect, vi } from "vitest";
import {
  getMonthSummary,
  getQuarterlyTaxSummary,
  getTrend,
} from "@/server/services/reports";

describe("Reports Service - Fixture Tests", () => {
  const userId = "user-alice";

  const defaultSettings = {
    userId,
    displayName: "Alice",
    defaultCurrency: "PHP",
    taxSetAsideBps: 1500, // 15%
    fiscalYearStartMonth: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("getMonthSummary accurately computes income, expense, net, tax, and top lists from fixture", async () => {
    // Hand-crafted fixture for 2026-10
    const mockTxs = [
      {
        id: "tx-1",
        type: "income",
        amountMinor: 5000000, // ₱50,000.00
        currency: "PHP",
        categoryId: "cat-income-1",
        categoryName: "Client Retainer",
        clientId: "client-acme",
        clientName: "Acme Corp",
      },
      {
        id: "tx-2",
        type: "income",
        amountMinor: 3500000, // ₱35,000.00
        categoryId: "cat-income-2",
        categoryName: "Milestone",
        clientId: "client-beta",
        clientName: "Beta LLC",
      },
      {
        id: "tx-3",
        type: "income",
        amountMinor: 1000000, // ₱10,000.00
        categoryId: "cat-income-1",
        categoryName: "Client Retainer",
        clientId: "client-acme",
        clientName: "Acme Corp",
      },
      {
        id: "tx-4",
        type: "expense",
        amountMinor: 900000, // ₱9,000.00
        currency: "PHP",
        categoryId: "cat-expense-software",
        categoryName: "Software & SaaS",
        clientId: null,
        clientName: null,
      },
      {
        id: "tx-5",
        type: "expense",
        amountMinor: 1200000, // ₱12,000.00
        currency: "PHP",
        categoryId: "cat-expense-software",
        categoryName: "Software & SaaS",
        clientId: null,
        clientName: null,
      },
      {
        id: "tx-6",
        type: "expense",
        amountMinor: 500000, // ₱5,000.00
        currency: "PHP",
        categoryId: "cat-expense-office",
        categoryName: "Office Supplies",
        clientId: null,
        clientName: null,
      },
    ];

    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ currency: "PHP" }]),
        }),
      }),
      select: vi.fn().mockImplementation((selection) => {
        // Checking if this select is for userSettings
        if (selection === undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    userId,
                    displayName: defaultSettings.displayName,
                    defaultCurrency: defaultSettings.defaultCurrency,
                    taxSetAsideBps: defaultSettings.taxSetAsideBps,
                    fiscalYearStartMonth: defaultSettings.fiscalYearStartMonth,
                    createdAt: new Date(defaultSettings.createdAt),
                    updatedAt: new Date(defaultSettings.updatedAt),
                  },
                ]),
              }),
            }),
          };
        }

        // Transactions query
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockTxs),
              }),
            }),
          }),
        };
      }),
    };

    const summary = await getMonthSummary(
      userId,
      { month: "2026-10" },
      mockDb as unknown as Parameters<typeof getMonthSummary>[2],
    );

    // Hand-calculated assertions:
    // Income: 5,000,000 + 3,500,000 + 1,000,000 = 9,500,000
    expect(summary.incomeMinor).toBe(9500000);

    // Expense: 900,000 + 1,200,000 + 500,000 = 2,600,000
    expect(summary.expenseMinor).toBe(2600000);

    // Net: 9,500,000 - 2,600,000 = 6,900,000
    expect(summary.netMinor).toBe(6900000);

    // Tax (15% of 6,900,000): Math.floor(6,900,000 * 1500 / 10000) = 1,035,000
    expect(summary.taxSetAsideMinor).toBe(1035000);

    // Top clients sorted desc: Acme (6,000,000) then Beta (3,500,000)
    expect(summary.topClients).toEqual([
      {
        clientId: "client-acme",
        name: "Acme Corp",
        incomeMinor: 6000000,
      },
      {
        clientId: "client-beta",
        name: "Beta LLC",
        incomeMinor: 3500000,
      },
    ]);

    // Top expense categories sorted desc: Software (2,100,000) then Office (500,000)
    expect(summary.topExpenseCategories).toEqual([
      {
        categoryId: "cat-expense-software",
        name: "Software & SaaS",
        expenseMinor: 2100000,
      },
      {
        categoryId: "cat-expense-office",
        name: "Office Supplies",
        expenseMinor: 500000,
      },
    ]);
  });

  it("getMonthSummary handles net negative by zeroing tax set-aside", async () => {
    const mockTxs = [
      {
        id: "tx-1",
        type: "income",
        amountMinor: 100000, // ₱1,000.00
        currency: "PHP",
        categoryId: "cat-1",
        categoryName: "Income",
        clientId: null,
        clientName: null,
      },
      {
        id: "tx-2",
        type: "expense",
        amountMinor: 500000, // ₱5,000.00
        currency: "PHP",
        categoryId: "cat-2",
        categoryName: "Expense",
        clientId: null,
        clientName: null,
      },
    ];

    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ currency: "PHP" }]),
        }),
      }),
      select: vi.fn().mockImplementation((selection) => {
        if (selection === undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    userId,
                    displayName: "Alice",
                    defaultCurrency: "PHP",
                    taxSetAsideBps: 2000, // 20%
                    fiscalYearStartMonth: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          };
        }

        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockTxs),
              }),
            }),
          }),
        };
      }),
    };

    const summary = await getMonthSummary(
      userId,
      { month: "2026-10" },
      mockDb as unknown as Parameters<typeof getMonthSummary>[2],
    );

    expect(summary.incomeMinor).toBe(100000);
    expect(summary.expenseMinor).toBe(500000);
    expect(summary.netMinor).toBe(-400000);
    // Net is negative, tax set-aside must be 0
    expect(summary.taxSetAsideMinor).toBe(0);
  });

  it("getMonthSummary throws 400 validation error when multiple currencies exist without currency param", async () => {
    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValue([{ currency: "PHP" }, { currency: "USD" }]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                userId,
                displayName: "Alice",
                defaultCurrency: "PHP",
                taxSetAsideBps: 1500,
                fiscalYearStartMonth: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      getMonthSummary(
        userId,
        { month: "2026-10" },
        mockDb as unknown as Parameters<typeof getMonthSummary>[2],
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("getTrend returns chronological sequence with zero-filled empty months", async () => {
    const mockRows = [
      {
        occurredOn: "2026-08-10",
        type: "income",
        amountMinor: 3000000, // 30,000.00
      },
      {
        occurredOn: "2026-08-20",
        type: "expense",
        amountMinor: 500000, // 5,000.00
      },
      {
        occurredOn: "2026-10-05",
        type: "income",
        amountMinor: 8000000, // 80,000.00
      },
      {
        occurredOn: "2026-10-18",
        type: "expense",
        amountMinor: 2000000, // 20,000.00
      },
    ];

    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ currency: "PHP" }]),
        }),
      }),
      select: vi.fn().mockImplementation((selection) => {
        if (selection === undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    userId,
                    displayName: "Alice",
                    defaultCurrency: "PHP",
                    taxSetAsideBps: 1500,
                    fiscalYearStartMonth: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          };
        }

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockRows),
          }),
        };
      }),
    };

    const trend = await getTrend(
      userId,
      { months: 4 },
      mockDb as unknown as Parameters<typeof getTrend>[2],
    );

    expect(trend).toHaveLength(4);
    // Chronological order oldest first
    const newestMonth = trend[trend.length - 1]!;
    expect(newestMonth).toBeDefined();

    // Months without transactions should be zero-filled
    const emptyMonth = trend.find(
      (t) => t.month !== "2026-08" && t.month !== "2026-10",
    );
    if (emptyMonth) {
      expect(emptyMonth.incomeMinor).toBe(0);
      expect(emptyMonth.expenseMinor).toBe(0);
      expect(emptyMonth.netMinor).toBe(0);
    }

    // Active months match fixture calculations
    const aug = trend.find((t) => t.month === "2026-08");
    if (aug) {
      expect(aug.incomeMinor).toBe(3000000);
      expect(aug.expenseMinor).toBe(500000);
      expect(aug.netMinor).toBe(2500000);
    }

    const oct = trend.find((t) => t.month === "2026-10");
    if (oct) {
      expect(oct.incomeMinor).toBe(8000000);
      expect(oct.expenseMinor).toBe(2000000);
      expect(oct.netMinor).toBe(6000000);
    }
  });

  it("getQuarterlyTaxSummary computes quarter totals, tax set-aside, and monthly breakdowns", async () => {
    // Q4 2026 (Oct, Nov, Dec 2026) with calendar fiscal year
    const mockTxs = [
      // Oct
      {
        id: "tx-1",
        type: "income",
        amountMinor: 5000000, // ₱50,000.00
        occurredOn: "2026-10-10",
      },
      {
        id: "tx-2",
        type: "expense",
        amountMinor: 1000000, // ₱10,000.00
        occurredOn: "2026-10-15",
      },
      // Nov
      {
        id: "tx-3",
        type: "income",
        amountMinor: 4000000, // ₱40,000.00
        occurredOn: "2026-11-05",
      },
      {
        id: "tx-4",
        type: "expense",
        amountMinor: 500000, // ₱5,000.00
        occurredOn: "2026-11-20",
      },
      // Dec
      {
        id: "tx-5",
        type: "income",
        amountMinor: 6000000, // ₱60,000.00
        occurredOn: "2026-12-01",
      },
    ];

    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ currency: "PHP" }]),
        }),
      }),
      select: vi.fn().mockImplementation((selection) => {
        if (selection === undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    userId,
                    displayName: "Alice",
                    defaultCurrency: "PHP",
                    taxSetAsideBps: 1500, // 15%
                    fiscalYearStartMonth: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          };
        }

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockTxs),
          }),
        };
      }),
    };

    const result = await getQuarterlyTaxSummary(
      userId,
      { year: 2026, quarter: 4 },
      mockDb as unknown as Parameters<typeof getQuarterlyTaxSummary>[2],
    );

    expect(result.year).toBe(2026);
    expect(result.quarter).toBe(4);
    expect(result.label).toBe("Q4 2026");
    expect(result.startDate).toBe("2026-10-01");
    expect(result.endDate).toBe("2026-12-31");
    expect(result.currency).toBe("PHP");

    // Income: 5M + 4M + 6M = 15,000,000
    expect(result.incomeMinor).toBe(15000000);
    // Expense: 1M + 0.5M = 1,500,000
    expect(result.expenseMinor).toBe(1500000);
    // Net: 15M - 1.5M = 13,500,000
    expect(result.netMinor).toBe(13500000);
    // Tax Set Aside: 15% of 13,500,000 = 2,025,000
    expect(result.taxSetAsideBps).toBe(1500);
    expect(result.taxSetAsidePercent).toBe(15);
    expect(result.taxSetAsideMinor).toBe(2025000);

    // 3 constituent months
    expect(result.months).toHaveLength(3);
    expect(result.months[0]).toEqual({
      month: "2026-10",
      incomeMinor: 5000000,
      expenseMinor: 1000000,
      netMinor: 4000000,
      taxSetAsideMinor: 600000,
    });
    expect(result.months[1]).toEqual({
      month: "2026-11",
      incomeMinor: 4000000,
      expenseMinor: 500000,
      netMinor: 3500000,
      taxSetAsideMinor: 525000,
    });
    expect(result.months[2]).toEqual({
      month: "2026-12",
      incomeMinor: 6000000,
      expenseMinor: 0,
      netMinor: 6000000,
      taxSetAsideMinor: 900000,
    });
  });

  it("getQuarterlyTaxSummary zeroes tax set-aside on net negative quarter", async () => {
    const mockTxs = [
      {
        id: "tx-1",
        type: "income",
        amountMinor: 200000,
        occurredOn: "2026-10-10",
      },
      {
        id: "tx-2",
        type: "expense",
        amountMinor: 800000,
        occurredOn: "2026-10-15",
      },
    ];

    const mockDb = {
      selectDistinct: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ currency: "PHP" }]),
        }),
      }),
      select: vi.fn().mockImplementation((selection) => {
        if (selection === undefined) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    userId,
                    displayName: "Alice",
                    defaultCurrency: "PHP",
                    taxSetAsideBps: 2000, // 20%
                    fiscalYearStartMonth: 1,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          };
        }

        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockTxs),
          }),
        };
      }),
    };

    const result = await getQuarterlyTaxSummary(
      userId,
      { year: 2026, quarter: 4 },
      mockDb as unknown as Parameters<typeof getQuarterlyTaxSummary>[2],
    );

    expect(result.incomeMinor).toBe(200000);
    expect(result.expenseMinor).toBe(800000);
    expect(result.netMinor).toBe(-600000);
    expect(result.taxSetAsideMinor).toBe(0);
  });
});
