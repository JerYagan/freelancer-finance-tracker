import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getOfflineQueue,
  enqueueOfflineTransaction,
  removeOfflineTransaction,
  clearOfflineQueue,
  syncOfflineQueue,
} from "@/lib/offline-queue";
import type { TransactionCreateInput } from "@/lib/schemas/transactions";

describe("Offline Queue Unit Tests", () => {
  const sampleInput: TransactionCreateInput = {
    type: "expense",
    amountMinor: 25000,
    currency: "PHP",
    occurredOn: "2026-10-18",
    categoryId: "550e8400-e29b-41d4-a716-446655440001",
    clientId: null,
    projectId: null,
    description: "Coffee meeting",
    notes: null,
    paymentMethod: "Cash",
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns empty array when queue is empty", () => {
    expect(getOfflineQueue()).toEqual([]);
  });

  it("enqueues transactions and dispatches change event", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const id = enqueueOfflineTransaction(sampleInput);

    expect(id).toBeDefined();
    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.id).toBe(id);
    expect(queue[0]!.input.amountMinor).toBe(25000);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fft-offline-queue-change" }),
    );
  });

  it("removes specified transaction from queue", () => {
    const id1 = enqueueOfflineTransaction(sampleInput);
    const id2 = enqueueOfflineTransaction({
      ...sampleInput,
      description: "Notebook",
    });

    expect(getOfflineQueue()).toHaveLength(2);

    removeOfflineTransaction(id1);

    const queue = getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.id).toBe(id2);
  });

  it("clears entire queue", () => {
    enqueueOfflineTransaction(sampleInput);
    enqueueOfflineTransaction(sampleInput);
    expect(getOfflineQueue()).toHaveLength(2);

    clearOfflineQueue();
    expect(getOfflineQueue()).toEqual([]);
  });

  it("syncs queued transactions via fetch and drains successfully synced items", async () => {
    enqueueOfflineTransaction(sampleInput);
    enqueueOfflineTransaction({
      ...sampleInput,
      description: "Item 2",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: "server-id" } }),
    } as Response);

    const result = await syncOfflineQueue(mockFetch);

    expect(result.syncedCount).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(getOfflineQueue()).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("discards invalid transactions on 400 validation error without halting remaining sync", async () => {
    enqueueOfflineTransaction(sampleInput); // will fail validation
    enqueueOfflineTransaction({
      ...sampleInput,
      description: "Valid item",
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: { code: "VALIDATION_ERROR", message: "Invalid category" },
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: "server-id-2" } }),
      } as Response);

    const result = await syncOfflineQueue(mockFetch);

    expect(result.syncedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.error).toBe("Invalid category");
    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("halts sync loop when network error occurs preserving remaining items", async () => {
    enqueueOfflineTransaction(sampleInput);
    enqueueOfflineTransaction({
      ...sampleInput,
      description: "Item 2",
    });

    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const result = await syncOfflineQueue(mockFetch);

    expect(result.syncedCount).toBe(0);
    expect(getOfflineQueue()).toHaveLength(2);
  });
});
