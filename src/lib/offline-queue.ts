import type { TransactionCreateInput } from "@/lib/schemas/transactions";

export const OFFLINE_QUEUE_KEY = "fft_offline_transactions";

export interface QueuedTransaction {
  id: string;
  input: TransactionCreateInput;
  queuedAt: string;
}

export function getOfflineQueue(): QueuedTransaction[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineTransaction(
  input: TransactionCreateInput,
): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const item: QueuedTransaction = {
    id,
    input,
    queuedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined" && window.localStorage) {
    const current = getOfflineQueue();
    current.push(item);
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
    // Dispatch custom event for UI updates
    window.dispatchEvent(new Event("fft-offline-queue-change"));
  }

  return id;
}

export function removeOfflineTransaction(id: string): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  const current = getOfflineQueue();
  const filtered = current.filter((item) => item.id !== id);
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event("fft-offline-queue-change"));
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(OFFLINE_QUEUE_KEY);
  window.dispatchEvent(new Event("fft-offline-queue-change"));
}

export interface SyncResult {
  syncedCount: number;
  errors: Array<{ id: string; error: string }>;
}

export async function syncOfflineQueue(
  fetchFn: typeof fetch = fetch,
): Promise<SyncResult> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const item of queue) {
    try {
      const res = await fetchFn("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.input),
      });

      if (res.ok) {
        removeOfflineTransaction(item.id);
        syncedCount++;
      } else {
        const body = await res.json().catch(() => ({}));
        // If validation failed or rule broken, remove invalid item so queue doesn't stick
        if (res.status === 400 || res.status === 422) {
          removeOfflineTransaction(item.id);
          errors.push({
            id: item.id,
            error: body.error?.message || "Invalid transaction rejected",
          });
        } else {
          // Server error or rate limit: pause sync for remaining items
          errors.push({
            id: item.id,
            error: body.error?.message || "Server temporarily unavailable",
          });
          break;
        }
      }
    } catch {
      // Network still down or unreachable: halt sync loop
      break;
    }
  }

  return { syncedCount, errors };
}
