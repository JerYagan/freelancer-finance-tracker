import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  seedUserDefaults,
} from "@/server/services/seed";

describe("Seed defaults specification", () => {
  it("contains all required income categories per DATA_MODEL.md", () => {
    const incomeNames = DEFAULT_INCOME_CATEGORIES.map((c) => c.name);
    expect(incomeNames).toEqual([
      "Client work",
      "Retainer",
      "Royalties",
      "Other income",
    ]);
  });

  it("contains all required expense categories per DATA_MODEL.md", () => {
    const expenseNames = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name);
    expect(expenseNames).toEqual([
      "Software",
      "Equipment",
      "Internet and phone",
      "Coworking",
      "Marketing",
      "Taxes",
      "Fees",
      "Learning",
      "Other expense",
    ]);
  });

  it("assigns valid hex colors to all default categories", () => {
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat.color).toMatch(hexRegex);
    }
  });

  it("correctly partitions total categories into 4 income and 9 expense categories", () => {
    const income = DEFAULT_CATEGORIES.filter((c) => c.type === "income");
    const expense = DEFAULT_CATEGORIES.filter((c) => c.type === "expense");
    expect(income).toHaveLength(4);
    expect(expense).toHaveLength(9);
    expect(DEFAULT_CATEGORIES).toHaveLength(13);
  });
});

describe("seedUserDefaults logic", () => {
  it("inserts settings and default categories on first run", async () => {
    const insertedSettings: unknown[] = [];
    const insertedCategories: unknown[] = [];

    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue([]), // No existing settings
          })),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((val: unknown) => {
          if (Array.isArray(val)) {
            insertedCategories.push(...val);
          } else {
            insertedSettings.push(val);
          }
          return Promise.resolve();
        }),
      })),
    };

    // First call to select is for userSettings (returns []), second is for categories (returns [])
    let selectCallCount = 0;
    mockTx.select = vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              limit: vi.fn().mockResolvedValue([]),
            };
          }
          return Promise.resolve([]); // No existing categories
        }),
      })),
    }));

    const mockDb = {
      transaction: vi
        .fn()
        .mockImplementation(
          async (callback: (tx: typeof mockTx) => Promise<void>) => {
            return callback(mockTx);
          },
        ),
    };

    await seedUserDefaults(
      "user-123",
      "Jane Freelancer",
      mockDb as unknown as Parameters<typeof seedUserDefaults>[2],
    );

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(insertedSettings).toHaveLength(1);
    expect(insertedSettings[0]).toMatchObject({
      userId: "user-123",
      displayName: "Jane Freelancer",
      defaultCurrency: "PHP",
      taxSetAsideBps: 0,
      fiscalYearStartMonth: 1,
    });
    expect(insertedCategories).toHaveLength(13);
    expect((insertedCategories[0] as { userId: string }).userId).toBe(
      "user-123",
    );
  });

  it("is idempotent and does not re-insert existing settings or categories", async () => {
    const insertedSettings: unknown[] = [];
    const insertedCategories: unknown[] = [];

    let selectCallCount = 0;
    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++;
            if (selectCallCount === 1) {
              // Existing settings found
              return {
                limit: vi.fn().mockResolvedValue([{ userId: "user-123" }]),
              };
            }
            // All categories already exist
            return Promise.resolve(
              DEFAULT_CATEGORIES.map((c) => ({
                name: c.name,
                type: c.type,
              })),
            );
          }),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((val: unknown) => {
          if (Array.isArray(val)) {
            insertedCategories.push(...val);
          } else {
            insertedSettings.push(val);
          }
          return Promise.resolve();
        }),
      })),
    };

    const mockDb = {
      transaction: vi
        .fn()
        .mockImplementation(
          async (callback: (tx: typeof mockTx) => Promise<void>) => {
            return callback(mockTx);
          },
        ),
    };

    await seedUserDefaults(
      "user-123",
      "Jane Freelancer",
      mockDb as unknown as Parameters<typeof seedUserDefaults>[2],
    );

    expect(insertedSettings).toHaveLength(0);
    expect(insertedCategories).toHaveLength(0);
    expect(mockTx.insert).not.toHaveBeenCalled();
  });
});
