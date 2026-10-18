import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock purge service
vi.mock("@/server/services/purge", () => ({
  purgeSoftDeletedRows: vi.fn(),
}));

import { purgeSoftDeletedRows } from "@/server/services/purge";
import { POST as postPurgeRoute } from "@/app/api/v1/maintenance/purge/route";
import * as envModule from "@/server/env";
import { NextRequest } from "next/server";

describe("Maintenance Purge Route Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 UNAUTHENTICATED when CRON_SECRET is set but header is missing or incorrect", async () => {
    const originalEnv = envModule.env;
    vi.spyOn(envModule, "env", "get").mockReturnValue({
      ...originalEnv,
      CRON_SECRET: "super-secret-cron-token",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/maintenance/purge",
      {
        method: "POST",
        headers: { Authorization: "Bearer wrong-token" },
      },
    );

    const res = await postPurgeRoute(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 200 and triggers purge when CRON_SECRET matches", async () => {
    const originalEnv = envModule.env;
    vi.spyOn(envModule, "env", "get").mockReturnValue({
      ...originalEnv,
      CRON_SECRET: "super-secret-cron-token",
    });

    vi.mocked(purgeSoftDeletedRows).mockResolvedValue({
      purgedCount: 5,
      receiptKeysDeleted: ["users/u-1/receipts/rec-1.jpg"],
      cutoffDate: "2026-09-18T00:00:00.000Z",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/v1/maintenance/purge",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer super-secret-cron-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ olderThanDays: 30 }),
      },
    );

    const res = await postPurgeRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.purgedCount).toBe(5);
    expect(body.data.receiptKeysDeleted).toEqual([
      "users/u-1/receipts/rec-1.jpg",
    ]);
    expect(purgeSoftDeletedRows).toHaveBeenCalledWith({ olderThanDays: 30 });
  });
});
