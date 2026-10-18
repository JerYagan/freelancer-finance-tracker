import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock export service
vi.mock("@/server/services/export", () => ({
  exportTransactionsCsv: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import { exportTransactionsCsv } from "@/server/services/export";
import { GET as getExportCsvRoute } from "@/app/api/v1/export/transactions.csv/route";

const userA = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userB = {
  id: "user-b",
  name: "User B",
  email: "userb@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Export Route Handlers - Auth & Tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);

    const req = new Request("http://localhost/api/v1/export/transactions.csv");
    const res = await getExportCsvRoute(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("delegates to exportTransactionsCsv with userId and parsed date range", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userA);
    const sampleCsv =
      "date,type,amount,currency,category,client,project,description,payment_method\r\n2026-10-18,income,15000.00,PHP,Client work,Acme,,Milestone,bank";
    vi.mocked(exportTransactionsCsv).mockResolvedValue(sampleCsv);

    const req = new Request(
      "http://localhost/api/v1/export/transactions.csv?from=2026-10-01&to=2026-10-31",
    );
    const res = await getExportCsvRoute(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(
      'attachment; filename="transactions.csv"',
    );
    expect(exportTransactionsCsv).toHaveBeenCalledWith("user-a", {
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(text).toBe(sampleCsv);
  });

  it("tenancy: User B request queries User B and never User A", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userB);
    vi.mocked(exportTransactionsCsv).mockResolvedValue(
      "date,type,amount,currency\r\n",
    );

    const req = new Request("http://localhost/api/v1/export/transactions.csv");
    const res = await getExportCsvRoute(req);

    expect(res.status).toBe(200);
    expect(exportTransactionsCsv).toHaveBeenCalledWith("user-b", {});
  });

  it("rejects invalid date range with 400 validation error", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(userA);

    const req = new Request(
      "http://localhost/api/v1/export/transactions.csv?from=invalid-date",
    );
    const res = await getExportCsvRoute(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
