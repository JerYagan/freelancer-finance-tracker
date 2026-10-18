import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock account service
vi.mock("@/server/services/account", () => ({
  exportAccountData: vi.fn(),
  deleteUserAccount: vi.fn(),
}));

import { getSessionUser, type User } from "@/server/auth";
import {
  exportAccountData,
  deleteUserAccount,
} from "@/server/services/account";
import { GET as getAccountExport } from "@/app/api/v1/account/export/route";
import { DELETE as deleteAccountRoute } from "@/app/api/v1/account/route";

const mockUser: User = {
  id: "user-123",
  name: "Jane Dev",
  email: "jane@example.com",
  emailVerified: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("Account Routes Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/account/export", () => {
    it("returns 401 UNAUTHENTICATED when not logged in", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/account/export");
      const res = await getAccountExport(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error?.code).toBe("UNAUTHENTICATED");
    });

    it("returns 200 with attachment header and user export data when authenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser);
      vi.mocked(exportAccountData).mockResolvedValue({
        exportedAt: "2026-10-18T10:00:00.000Z",
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          createdAt: mockUser.createdAt.toISOString(),
        },
        settings: {
          userId: mockUser.id,
          displayName: "Jane Dev",
          defaultCurrency: "PHP",
          taxSetAsideBps: 2000,
          fiscalYearStartMonth: 1,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        },
        categories: [],
        clients: [],
        projects: [],
        invoices: [],
        recurringRules: [],
        transactions: [],
      });

      const req = new Request("http://localhost:3000/api/v1/account/export");
      const res = await getAccountExport(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Disposition")).toContain(
        'attachment; filename="freelancer-finance-account-export-',
      );
      expect(json.data.user.email).toBe("jane@example.com");
      expect(exportAccountData).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("DELETE /api/v1/account", () => {
    it("returns 401 UNAUTHENTICATED when not logged in", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "DELETE" }),
      });
      const res = await deleteAccountRoute(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error?.code).toBe("UNAUTHENTICATED");
    });

    it("returns 400 VALIDATION_ERROR when confirmPhrase does not match DELETE", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser);

      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "delete" }),
      });
      const res = await deleteAccountRoute(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error?.code).toBe("VALIDATION_ERROR");
      expect(deleteUserAccount).not.toHaveBeenCalled();
    });

    it("returns 200 OK when confirmPhrase is valid and deletes account", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser);
      vi.mocked(deleteUserAccount).mockResolvedValue({ deleted: true });

      const req = new Request("http://localhost:3000/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: "DELETE" }),
      });
      const res = await deleteAccountRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.deleted).toBe(true);
      expect(deleteUserAccount).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
