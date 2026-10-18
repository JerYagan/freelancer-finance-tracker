import { describe, it, expect, vi } from "vitest";
import {
  getSettings,
  toSettingsDto,
  updateSettings,
} from "@/server/services/settings";

describe("Settings Service - DTO Mapping", () => {
  it("maps DB record to SettingsDto properly", () => {
    const now = new Date("2026-10-18T10:00:00.000Z");
    const row = {
      userId: "user-123",
      displayName: "Jane Doe",
      defaultCurrency: "USD",
      taxSetAsideBps: 2000,
      fiscalYearStartMonth: 4,
      createdAt: now,
      updatedAt: now,
    };

    const dto = toSettingsDto(row);
    expect(dto).toEqual({
      userId: "user-123",
      displayName: "Jane Doe",
      defaultCurrency: "USD",
      taxSetAsideBps: 2000,
      fiscalYearStartMonth: 4,
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T10:00:00.000Z",
    });
  });

  it("handles null displayName", () => {
    const now = new Date("2026-10-18T10:00:00.000Z");
    const row = {
      userId: "user-123",
      displayName: null,
      defaultCurrency: "PHP",
      taxSetAsideBps: 0,
      fiscalYearStartMonth: 1,
      createdAt: now,
      updatedAt: now,
    };

    const dto = toSettingsDto(row);
    expect(dto.displayName).toBeNull();
  });
});

describe("Settings Service - getSettings", () => {
  const userId = "user-abc";

  it("returns existing settings when record exists", async () => {
    const mockDb = {
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

    const res = await getSettings(
      userId,
      mockDb as unknown as Parameters<typeof getSettings>[1],
    );
    expect(res.userId).toBe(userId);
    expect(res.displayName).toBe("Alice");
    expect(res.taxSetAsideBps).toBe(1500);
  });

  it("inserts default settings when record does not exist", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                userId,
                displayName: null,
                defaultCurrency: "PHP",
                taxSetAsideBps: 0,
                fiscalYearStartMonth: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    };

    const res = await getSettings(
      userId,
      mockDb as unknown as Parameters<typeof getSettings>[1],
    );
    expect(res.userId).toBe(userId);
    expect(res.defaultCurrency).toBe("PHP");
    expect(res.taxSetAsideBps).toBe(0);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });
});

describe("Settings Service - updateSettings", () => {
  const userId = "user-abc";

  it("updates settings with uppercase currency and returns updated DTO", async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                userId,
                displayName: "Updated Name",
                defaultCurrency: "EUR",
                taxSetAsideBps: 2500,
                fiscalYearStartMonth: 7,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    };

    const res = await updateSettings(
      userId,
      {
        displayName: "Updated Name",
        defaultCurrency: "eur",
        taxSetAsideBps: 2500,
        fiscalYearStartMonth: 7,
      },
      mockDb as unknown as Parameters<typeof updateSettings>[2],
    );

    expect(res.displayName).toBe("Updated Name");
    expect(res.defaultCurrency).toBe("EUR");
    expect(res.taxSetAsideBps).toBe(2500);
    expect(res.fiscalYearStartMonth).toBe(7);
  });
});
