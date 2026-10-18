import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  previewCsvTransactions,
  importTransactionsFromCsv,
} from "@/server/services/import";
import * as transactionsService from "@/server/services/transactions";
import { AppError } from "@/server/http";

type DbClient = Parameters<typeof previewCsvTransactions>[2];

describe("Import Service - previewCsvTransactions", () => {
  const userId = "user-alice";
  const catIncomeId = "123e4567-e89b-12d3-a456-426614174001";
  const catExpenseId = "123e4567-e89b-12d3-a456-426614174002";
  const clientId = "123e4567-e89b-12d3-a456-426614174003";

  const activeCategories = [
    { id: catIncomeId, name: "Consulting", type: "income" as const },
    { id: catExpenseId, name: "Software", type: "expense" as const },
  ];

  const activeClients = [{ id: clientId, name: "Acme Corp" }];

  function createMockDb() {
    let callIndex = 0;
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callIndex++;
            // Call 1: userSettings (if requested)
            // Call 2: categories
            // Call 3: clients
            return {
              limit: vi.fn().mockResolvedValue([{ defaultCurrency: "PHP" }]),
              then<TResult1 = unknown[], TResult2 = never>(
                onfulfilled?:
                  | ((value: unknown[]) => TResult1 | PromiseLike<TResult1>)
                  | null,
                onrejected?:
                  | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
                  | null,
              ) {
                // If this is the categories or clients query
                const result =
                  callIndex === 1
                    ? activeCategories
                    : callIndex === 2
                      ? activeClients
                      : [];
                return Promise.resolve(result).then(onfulfilled, onrejected);
              },
            };
          }),
        }),
      }),
    } as unknown as DbClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws validation error on empty CSV text", async () => {
    const mockDb = createMockDb();
    await expect(
      previewCsvTransactions(
        userId,
        {
          csvText: "   ",
          mapping: {
            hasHeader: true,
            dateColumn: "Date",
            amountColumn: "Amount",
            dateFormat: "YYYY-MM-DD",
            defaultType: "income",
          },
        },
        mockDb,
      ),
    ).rejects.toThrow(AppError);
  });

  it("throws validation error on CSV with only headers and no data", async () => {
    const mockDb = createMockDb();
    await expect(
      previewCsvTransactions(
        userId,
        {
          csvText: "Date,Amount\n",
          mapping: {
            hasHeader: true,
            dateColumn: "Date",
            amountColumn: "Amount",
            dateFormat: "YYYY-MM-DD",
            defaultType: "income",
          },
        },
        mockDb,
      ),
    ).rejects.toThrow(AppError);
  });

  it("throws validation error if date column or amount column is not found", async () => {
    const mockDb = createMockDb();
    await expect(
      previewCsvTransactions(
        userId,
        {
          csvText: "Col1,Col2\n2026-10-18,100",
          mapping: {
            hasHeader: true,
            dateColumn: "NonExistentDate",
            amountColumn: "Col2",
            dateFormat: "YYYY-MM-DD",
            defaultType: "income",
          },
        },
        mockDb,
      ),
    ).rejects.toThrow(/Date column "NonExistentDate" not found/);
  });

  it("correctly parses valid rows and matches categories and clients", async () => {
    const mockDb = createMockDb();
    const csv = [
      "Date,Amount,Category,Client,Description",
      "2026-10-18,15000.00,Consulting,Acme Corp,Initial Milestone",
      "2026-10-19,(250.00),Software,,Figma Subscription",
    ].join("\n");

    const result = await previewCsvTransactions(
      userId,
      {
        csvText: csv,
        mapping: {
          hasHeader: true,
          dateColumn: "Date",
          amountColumn: "Amount",
          categoryColumn: "Category",
          clientColumn: "Client",
          descriptionColumn: "Description",
          dateFormat: "YYYY-MM-DD",
          defaultType: "income",
          currency: "PHP",
        },
      },
      mockDb,
    );

    expect(result.totalRows).toBe(2);
    expect(result.validCount).toBe(2);
    expect(result.errorCount).toBe(0);

    // Row 1: Consulting income
    expect(result.preview[0]?.isValid).toBe(true);
    expect(result.preview[0]?.parsed).toEqual({
      type: "income",
      amountMinor: 1500000,
      currency: "PHP",
      occurredOn: "2026-10-18",
      categoryId: catIncomeId,
      clientId: clientId,
      description: "Initial Milestone",
      paymentMethod: null,
    });

    // Row 2: Software expense via accounting parentheses
    expect(result.preview[1]?.isValid).toBe(true);
    expect(result.preview[1]?.parsed).toEqual({
      type: "expense",
      amountMinor: 25000,
      currency: "PHP",
      occurredOn: "2026-10-19",
      categoryId: catExpenseId,
      clientId: null,
      description: "Figma Subscription",
      paymentMethod: null,
    });
  });

  it("handles date format variations and flags row errors", async () => {
    const mockDb = createMockDb();
    const csv = [
      "Date,Amount",
      "10/18/2026,500.00",
      "invalid-date,100.00",
      "10/20/2026,0",
    ].join("\n");

    const result = await previewCsvTransactions(
      userId,
      {
        csvText: csv,
        mapping: {
          hasHeader: true,
          dateColumn: "Date",
          amountColumn: "Amount",
          dateFormat: "MM/DD/YYYY",
          defaultType: "income",
          defaultCategoryId: catIncomeId,
          currency: "PHP",
        },
      },
      mockDb,
    );

    expect(result.totalRows).toBe(3);
    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(2);

    // Row 0 valid
    expect(result.preview[0]?.isValid).toBe(true);
    expect(result.preview[0]?.parsed?.occurredOn).toBe("2026-10-18");

    // Row 1 invalid date
    expect(result.preview[1]?.isValid).toBe(false);
    expect(result.preview[1]?.errors).toContain(
      'Invalid date "invalid-date" for format MM/DD/YYYY',
    );

    // Row 2 invalid amount 0
    expect(result.preview[2]?.isValid).toBe(false);
    expect(result.preview[2]?.errors).toContain(
      "Amount must be greater than zero",
    );
  });
});

describe("Import Service - importTransactionsFromCsv", () => {
  const userId = "user-alice";
  const catIncomeId = "123e4567-e89b-12d3-a456-426614174001";

  const activeCategories = [
    { id: catIncomeId, name: "Consulting", type: "income" as const },
  ];

  function createMockDb() {
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            then<TResult1 = unknown[], TResult2 = never>(
              onfulfilled?:
                ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?:
                ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              return Promise.resolve(activeCategories).then(
                onfulfilled,
                onrejected,
              );
            },
          }),
        }),
      }),
    } as unknown as DbClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws ruleViolation if invalid rows exist and skipInvalid is false", async () => {
    const mockDb = createMockDb();
    const csv = ["Date,Amount", "2026-10-18,100", "invalid-date,200"].join(
      "\n",
    );

    await expect(
      importTransactionsFromCsv(
        userId,
        {
          csvText: csv,
          mapping: {
            hasHeader: true,
            dateColumn: "Date",
            amountColumn: "Amount",
            defaultType: "income",
            defaultCategoryId: catIncomeId,
            dateFormat: "YYYY-MM-DD",
            currency: "PHP",
          },
          skipInvalid: false,
        },
        mockDb,
      ),
    ).rejects.toThrow(AppError);
  });

  it("imports valid rows and skips invalid rows when skipInvalid is true", async () => {
    const mockDb = createMockDb();
    const csv = [
      "Date,Amount,Description",
      "2026-10-18,1000.00,Valid One",
      "invalid-date,200.00,Bad Row",
    ].join("\n");

    const spyCreate = vi
      .spyOn(transactionsService, "createTransaction")
      .mockResolvedValue({
        id: "123e4567-e89b-12d3-a456-426614174099",
        type: "income",
        amountMinor: 100000,
        currency: "PHP",
        occurredOn: "2026-10-18",
        category: {
          id: catIncomeId,
          name: "Consulting",
          color: "#0d9488",
        },
        client: null,
        project: null,
        description: "Valid One",
        paymentMethod: null,
        notes: null,
        createdAt: "2026-10-18T10:00:00.000Z",
        updatedAt: "2026-10-18T10:00:00.000Z",
      });

    const result = await importTransactionsFromCsv(
      userId,
      {
        csvText: csv,
        mapping: {
          hasHeader: true,
          dateColumn: "Date",
          amountColumn: "Amount",
          descriptionColumn: "Description",
          defaultType: "income",
          defaultCategoryId: catIncomeId,
          dateFormat: "YYYY-MM-DD",
          currency: "PHP",
        },
        skipInvalid: true,
      },
      mockDb,
    );

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.transactions).toHaveLength(1);
    expect(spyCreate).toHaveBeenCalledTimes(1);
  });
});
