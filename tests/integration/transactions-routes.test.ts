import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock transactions service
vi.mock("@/server/services/transactions", () => ({
  listTransactions: vi.fn(),
  getTransactionById: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  restoreTransaction: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  restoreTransaction,
  updateTransaction,
} from "@/server/services/transactions";
import {
  GET as getTransactions,
  POST as postTransactions,
} from "@/app/api/v1/transactions/route";
import {
  DELETE as deleteTransactionById,
  GET as getTransactionByIdRoute,
  PATCH as patchTransactionById,
} from "@/app/api/v1/transactions/[id]/route";
import { POST as restoreTransactionRoute } from "@/app/api/v1/transactions/[id]/restore/route";
import { AppError } from "@/server/http";

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

const txA = {
  id: "123e4567-e89b-12d3-a456-426614174090",
  type: "income" as const,
  amountMinor: 150000,
  currency: "PHP",
  occurredOn: "2026-10-18",
  category: { id: "cat-1", name: "Client work", color: "#16a34a" },
  client: null,
  project: null,
  description: "Consulting",
  notes: null,
  paymentMethod: "bank",
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Transactions Routes - Tenancy & Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 UNAUTHENTICATED when unauthenticated", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/transactions");
      const res = await getTransactions(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Transactions Tenancy", () => {
    it("User B cannot view User A's transaction by ID (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(getTransactionById).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === txA.id) {
          throw AppError.notFound("Transaction not found");
        }
        return txA;
      });

      const req = new Request(`http://localhost/api/v1/transactions/${txA.id}`);
      const res = await getTransactionByIdRoute(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(404);
      expect(res.status).not.toBe(403);
    });

    it("User B cannot update User A's transaction (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(updateTransaction).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === txA.id) {
          throw AppError.notFound("Transaction not found");
        }
        return txA;
      });

      const req = new Request(
        `http://localhost/api/v1/transactions/${txA.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ amountMinor: 200000 }),
        },
      );
      const res = await patchTransactionById(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B cannot delete User A's transaction (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(deleteTransaction).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === txA.id) {
          throw AppError.notFound("Transaction not found");
        }
      });

      const req = new Request(
        `http://localhost/api/v1/transactions/${txA.id}`,
        {
          method: "DELETE",
        },
      );
      const res = await deleteTransactionById(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B cannot restore User A's transaction (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(restoreTransaction).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === txA.id) {
          throw AppError.notFound("Transaction not found or not deleted");
        }
        return txA;
      });

      const req = new Request(
        `http://localhost/api/v1/transactions/${txA.id}/restore`,
        {
          method: "POST",
        },
      );
      const res = await restoreTransactionRoute(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(404);
    });

    it("User B's transaction listing is scoped to User B", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(listTransactions).mockResolvedValue({
        data: [],
        meta: { nextCursor: null, limit: 50 },
      });

      const req = new Request("http://localhost/api/v1/transactions");
      const res = await getTransactions(req);

      expect(res.status).toBe(200);
      expect(listTransactions).toHaveBeenCalledWith(
        "user-b",
        expect.anything(),
      );
    });
  });

  describe("Happy Paths", () => {
    it("POST /api/v1/transactions creates transaction with 201", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createTransaction).mockResolvedValue(txA);

      const req = new Request("http://localhost/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify({
          type: "income",
          amountMinor: 150000,
          currency: "PHP",
          occurredOn: "2026-10-18",
          categoryId: "123e4567-e89b-12d3-a456-426614174001",
        }),
      });
      const res = await postTransactions(req);

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.amountMinor).toBe(150000);
    });

    it("DELETE /api/v1/transactions/:id soft deletes with 204", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(deleteTransaction).mockResolvedValue();

      const req = new Request(
        `http://localhost/api/v1/transactions/${txA.id}`,
        {
          method: "DELETE",
        },
      );
      const res = await deleteTransactionById(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(204);
    });

    it("POST /api/v1/transactions/:id/restore restores with 200", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(restoreTransaction).mockResolvedValue(txA);

      const req = new Request(
        `http://localhost/api/v1/transactions/${txA.id}/restore`,
        {
          method: "POST",
        },
      );
      const res = await restoreTransactionRoute(req, {
        params: Promise.resolve({ id: txA.id }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(txA.id);
    });
  });
});
