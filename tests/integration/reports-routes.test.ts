import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock reports service
vi.mock("@/server/services/reports", () => ({
  getMonthSummary: vi.fn(),
  getTrend: vi.fn(),
  getQuarterlyTaxSummary: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import {
  getMonthSummary,
  getQuarterlyTaxSummary,
  getTrend,
} from "@/server/services/reports";
import { GET as getSummaryRoute } from "@/app/api/v1/reports/summary/route";
import { GET as getTrendRoute } from "@/app/api/v1/reports/trend/route";
import { GET as getTaxSummaryRoute } from "@/app/api/v1/reports/tax-summary/route";

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

describe("Reports Route Handlers - Auth & Tenancy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/reports/summary", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        "http://localhost/api/v1/reports/summary?month=2026-10",
      );
      const res = await getSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHENTICATED");
    });

    it("delegates to getMonthSummary with user session id and parsed query", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(getMonthSummary).mockResolvedValue({
        month: "2026-10",
        currency: "PHP",
        incomeMinor: 5000000,
        expenseMinor: 1000000,
        netMinor: 4000000,
        taxSetAsideMinor: 600000,
        topClients: [],
        topExpenseCategories: [],
      });

      const req = new Request(
        "http://localhost/api/v1/reports/summary?month=2026-10&currency=PHP",
      );
      const res = await getSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getMonthSummary).toHaveBeenCalledWith("user-a", {
        month: "2026-10",
        currency: "PHP",
      });
      expect(body.data.netMinor).toBe(4000000);
    });

    it("tenancy: User B receives User B's summary and never User A's", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(getMonthSummary).mockResolvedValue({
        month: "2026-10",
        currency: "USD",
        incomeMinor: 200000,
        expenseMinor: 50000,
        netMinor: 150000,
        taxSetAsideMinor: 0,
        topClients: [],
        topExpenseCategories: [],
      });

      const req = new Request(
        "http://localhost/api/v1/reports/summary?month=2026-10",
      );
      const res = await getSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getMonthSummary).toHaveBeenCalledWith("user-b", {
        month: "2026-10",
      });
      expect(body.data.currency).toBe("USD");
    });
  });

  describe("GET /api/v1/reports/trend", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/reports/trend?months=6");
      const res = await getTrendRoute(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHENTICATED");
    });

    it("delegates to getTrend with user session id and parsed query", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(getTrend).mockResolvedValue([
        { month: "2026-05", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
        { month: "2026-06", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
        { month: "2026-07", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
        { month: "2026-08", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
        { month: "2026-09", incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
        {
          month: "2026-10",
          incomeMinor: 5000000,
          expenseMinor: 1000000,
          netMinor: 4000000,
        },
      ]);

      const req = new Request(
        "http://localhost/api/v1/reports/trend?months=6&currency=PHP",
      );
      const res = await getTrendRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getTrend).toHaveBeenCalledWith("user-a", {
        months: 6,
        currency: "PHP",
      });
      expect(body.data).toHaveLength(6);
    });

    it("validates months bounds (rejects months > 24)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        "http://localhost/api/v1/reports/trend?months=30",
      );
      const res = await getTrendRoute(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/v1/reports/tax-summary", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request(
        "http://localhost/api/v1/reports/tax-summary?year=2026&quarter=4",
      );
      const res = await getTaxSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe("UNAUTHENTICATED");
    });

    it("delegates to getQuarterlyTaxSummary with authenticated userId and parsed query", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(getQuarterlyTaxSummary).mockResolvedValue({
        year: 2026,
        quarter: 4,
        label: "Q4 2026",
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        currency: "PHP",
        incomeMinor: 15000000,
        expenseMinor: 3000000,
        netMinor: 12000000,
        taxSetAsideBps: 1500,
        taxSetAsidePercent: 15,
        taxSetAsideMinor: 1800000,
        months: [],
      });

      const req = new Request(
        "http://localhost/api/v1/reports/tax-summary?year=2026&quarter=4&currency=PHP",
      );
      const res = await getTaxSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(getQuarterlyTaxSummary).toHaveBeenCalledWith("user-a", {
        year: 2026,
        quarter: 4,
        currency: "PHP",
      });
      expect(body.data.taxSetAsideMinor).toBe(1800000);
    });

    it("enforces tenancy: passes User B id when authenticated as User B", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(getQuarterlyTaxSummary).mockResolvedValue({
        year: 2026,
        quarter: 4,
        label: "Q4 2026",
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        currency: "USD",
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        taxSetAsideBps: 1500,
        taxSetAsidePercent: 15,
        taxSetAsideMinor: 0,
        months: [],
      });

      const req = new Request("http://localhost/api/v1/reports/tax-summary");
      const res = await getTaxSummaryRoute(req);

      expect(res.status).toBe(200);
      expect(getQuarterlyTaxSummary).toHaveBeenCalledWith("user-b", {});
    });

    it("validates quarter bounds (rejects quarter = 5)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request(
        "http://localhost/api/v1/reports/tax-summary?quarter=5",
      );
      const res = await getTaxSummaryRoute(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
