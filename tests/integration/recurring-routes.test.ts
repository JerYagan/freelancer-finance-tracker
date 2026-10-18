import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock recurring service
vi.mock("@/server/services/recurring", () => ({
  listRecurringRules: vi.fn(),
  getRecurringRuleById: vi.fn(),
  createRecurringRule: vi.fn(),
  updateRecurringRule: vi.fn(),
  deleteRecurringRule: vi.fn(),
  generateDueRecurringTransactions: vi.fn(),
}));

import { getSessionUser, type User } from "@/server/auth";
import {
  createRecurringRule,
  deleteRecurringRule,
  generateDueRecurringTransactions,
  getRecurringRuleById,
  listRecurringRules,
  updateRecurringRule,
} from "@/server/services/recurring";
import {
  GET as getRecurring,
  POST as postRecurring,
} from "@/app/api/v1/recurring/route";
import {
  DELETE as deleteRecurringById,
  GET as getRecurringByIdRoute,
  PATCH as patchRecurringById,
} from "@/app/api/v1/recurring/[id]/route";
import { POST as postGenerate } from "@/app/api/v1/recurring/generate/route";
import { AppError } from "@/server/http";

const userA: User = {
  id: "user-a",
  name: "User A",
  email: "usera@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const userB: User = {
  id: "user-b",
  name: "User B",
  email: "userb@example.com",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRule = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  interval: "monthly" as const,
  nextRunOn: "2026-11-01",
  endsOn: null,
  active: true,
  template: {
    type: "expense" as const,
    amountMinor: 50000,
    currency: "PHP",
    categoryId: "123e4567-e89b-12d3-a456-426614174001",
    clientId: null,
    projectId: null,
    description: "Software Subscription",
    paymentMethod: null,
    notes: null,
  },
  category: {
    id: "123e4567-e89b-12d3-a456-426614174001",
    name: "Software",
    color: "#6366f1",
  },
  client: null,
  project: null,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Recurring Rules API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 UNAUTHENTICATED when no session exists", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/recurring");
      const res = await getRecurring(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Tenancy Isolation", () => {
    it("passes active user ID to listRecurringRules", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(listRecurringRules).mockResolvedValue([mockRule]);

      const req = new Request("http://localhost/api/v1/recurring?active=true");
      const res = await getRecurring(req);

      expect(res.status).toBe(200);
      expect(listRecurringRules).toHaveBeenCalledWith(
        "user-a",
        expect.objectContaining({ active: true }),
      );
    });

    it("prevents User B from accessing User A's recurring rule", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(getRecurringRuleById).mockRejectedValue(
        AppError.notFound("Recurring rule not found"),
      );

      const req = new Request(
        `http://localhost/api/v1/recurring/${mockRule.id}`,
      );
      const res = await getRecurringByIdRoute(req, {
        params: Promise.resolve({ id: mockRule.id }),
      });

      expect(res.status).toBe(404);
      expect(getRecurringRuleById).toHaveBeenCalledWith("user-b", mockRule.id);
    });

    it("prevents User B from updating or deleting User A's recurring rule", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(updateRecurringRule).mockRejectedValue(
        AppError.notFound("Recurring rule not found"),
      );
      vi.mocked(deleteRecurringRule).mockRejectedValue(
        AppError.notFound("Recurring rule not found"),
      );

      const patchReq = new Request(
        `http://localhost/api/v1/recurring/${mockRule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: false }),
        },
      );
      const patchRes = await patchRecurringById(patchReq, {
        params: Promise.resolve({ id: mockRule.id }),
      });
      expect(patchRes.status).toBe(404);

      const deleteReq = new Request(
        `http://localhost/api/v1/recurring/${mockRule.id}`,
        { method: "DELETE" },
      );
      const deleteRes = await deleteRecurringById(deleteReq, {
        params: Promise.resolve({ id: mockRule.id }),
      });
      expect(deleteRes.status).toBe(404);
    });
  });

  describe("CRUD & Generation Endpoints", () => {
    it("POST /api/v1/recurring creates rule and returns 201", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createRecurringRule).mockResolvedValue(mockRule);

      const req = new Request("http://localhost/api/v1/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: "monthly",
          nextRunOn: "2026-11-01",
          template: {
            type: "expense",
            amountMinor: 50000,
            categoryId: mockRule.template.categoryId,
            description: "Software Subscription",
          },
        }),
      });

      const res = await postRecurring(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.id).toBe(mockRule.id);
      expect(createRecurringRule).toHaveBeenCalledWith(
        "user-a",
        expect.objectContaining({ interval: "monthly" }),
      );
    });

    it("DELETE /api/v1/recurring/:id returns 204 no content", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(deleteRecurringRule).mockResolvedValue({
        id: mockRule.id,
        deleted: true,
      });

      const req = new Request(
        `http://localhost/api/v1/recurring/${mockRule.id}`,
        { method: "DELETE" },
      );
      const res = await deleteRecurringById(req, {
        params: Promise.resolve({ id: mockRule.id }),
      });

      expect(res.status).toBe(204);
      expect(deleteRecurringRule).toHaveBeenCalledWith("user-a", mockRule.id);
    });

    it("POST /api/v1/recurring/generate generates due transactions", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(generateDueRecurringTransactions).mockResolvedValue({
        generatedCount: 2,
        transactions: [],
      });

      const req = new Request(
        "http://localhost/api/v1/recurring/generate?throughDate=2026-10-18",
        {
          method: "POST",
        },
      );

      const res = await postGenerate(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.generatedCount).toBe(2);
      expect(generateDueRecurringTransactions).toHaveBeenCalledWith(
        "user-a",
        "2026-10-18",
      );
    });
  });
});
