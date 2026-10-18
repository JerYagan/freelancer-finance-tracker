import { describe, it, expect, vi, beforeEach } from "vitest";
import { purgeSoftDeletedRows } from "@/server/services/purge";
import * as storageService from "@/server/services/storage";

describe("Purge Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies expired soft-deleted transactions, deletes attached storage objects, and hard-deletes DB rows", async () => {
    const expiredRows = [
      { id: "tx-1", receiptKey: "users/u-1/receipts/rec-1.jpg" },
      { id: "tx-2", receiptKey: null },
      { id: "tx-3", receiptKey: "users/u-2/receipts/rec-3.pdf" },
    ];

    const deleteObjectSpy = vi
      .spyOn(storageService, "deleteObject")
      .mockResolvedValue(true);

    const deleteWhereMock = vi.fn().mockResolvedValue({ count: 3 });
    const selectWhereMock = vi.fn().mockResolvedValue(expiredRows);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: selectWhereMock,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: deleteWhereMock,
      }),
    };

    const result = await purgeSoftDeletedRows({
      olderThanDays: 30,
      dbClient: mockDb,
    });

    expect(result.purgedCount).toBe(3);
    expect(result.receiptKeysDeleted).toEqual([
      "users/u-1/receipts/rec-1.jpg",
      "users/u-2/receipts/rec-3.pdf",
    ]);
    expect(deleteObjectSpy).toHaveBeenCalledTimes(2);
    expect(deleteObjectSpy).toHaveBeenCalledWith({
      key: "users/u-1/receipts/rec-1.jpg",
    });
    expect(deleteObjectSpy).toHaveBeenCalledWith({
      key: "users/u-2/receipts/rec-3.pdf",
    });
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("handles case where no rows are eligible for purging", async () => {
    const deleteObjectSpy = vi.spyOn(storageService, "deleteObject");

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ count: 0 }),
      }),
    };

    const result = await purgeSoftDeletedRows({
      olderThanDays: 30,
      dbClient: mockDb,
    });

    expect(result.purgedCount).toBe(0);
    expect(result.receiptKeysDeleted).toHaveLength(0);
    expect(deleteObjectSpy).not.toHaveBeenCalled();
  });

  it("calculates cutoff date matching olderThanDays offset", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ count: 0 }),
      }),
    };

    const before = Date.now();
    const result = await purgeSoftDeletedRows({
      olderThanDays: 60,
      dbClient: mockDb,
    });
    const after = Date.now();

    const cutoffEpoch = new Date(result.cutoffDate).getTime();
    const expectedEpoch = before - 60 * 24 * 60 * 60 * 1000;

    expect(Math.abs(cutoffEpoch - expectedEpoch)).toBeLessThanOrEqual(
      after - before + 1000,
    );
  });
});
