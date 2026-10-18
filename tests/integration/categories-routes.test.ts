import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module to control active session
vi.mock("@/server/auth", () => ({
  getSessionUser: vi.fn(),
}));

// Mock categories service to test route layer and tenancy handling
vi.mock("@/server/services/categories", () => ({
  listCategories: vi.fn(),
  getCategoryById: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

import { getSessionUser } from "@/server/auth";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from "@/server/services/categories";
import {
  GET as getCategories,
  POST as postCategories,
} from "@/app/api/v1/categories/route";
import {
  DELETE as deleteCategoryById,
  GET as getCategoryByIdRoute,
  PATCH as patchCategoryById,
} from "@/app/api/v1/categories/[id]/route";
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

const categoryA = {
  id: "123e4567-e89b-12d3-a456-426614174001",
  type: "income" as const,
  name: "Client work",
  color: "#16a34a",
  archivedAt: null,
  createdAt: "2026-10-18T10:00:00.000Z",
  updatedAt: "2026-10-18T10:00:00.000Z",
};

describe("Categories Route Handlers & Tenancy Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 UNAUTHENTICATED when request is made without a session", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const req = new Request("http://localhost/api/v1/categories");
      const res = await getCategories(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHENTICATED");
    });
  });

  describe("Multi-tenant Isolation", () => {
    it("User B cannot view User A's category by ID (returns 404 NOT_FOUND)", async () => {
      // User B is logged in
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      // Service enforces tenancy: when queried with userId=user-b and categoryA.id, throws notFound
      vi.mocked(getCategoryById).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === categoryA.id) {
          throw AppError.notFound("Category not found");
        }
        return categoryA;
      });

      const req = new Request(
        `http://localhost/api/v1/categories/${categoryA.id}`,
      );
      const res = await getCategoryByIdRoute(req, {
        params: Promise.resolve({ id: categoryA.id }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
      // Must NOT leak existence with a 403
      expect(res.status).not.toBe(403);
    });

    it("User B cannot update User A's category (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(updateCategory).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === categoryA.id) {
          throw AppError.notFound("Category not found");
        }
        return categoryA;
      });

      const req = new Request(
        `http://localhost/api/v1/categories/${categoryA.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Hacked" }),
        },
      );
      const res = await patchCategoryById(req, {
        params: Promise.resolve({ id: categoryA.id }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("User B cannot delete User A's category (returns 404 NOT_FOUND)", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);

      vi.mocked(deleteCategory).mockImplementation(async (userId, id) => {
        if (userId !== "user-a" && id === categoryA.id) {
          throw AppError.notFound("Category not found");
        }
      });

      const req = new Request(
        `http://localhost/api/v1/categories/${categoryA.id}`,
        { method: "DELETE" },
      );
      const res = await deleteCategoryById(req, {
        params: Promise.resolve({ id: categoryA.id }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("User B's category listing only retrieves categories scoped to User B", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userB);
      vi.mocked(listCategories).mockResolvedValue([]);

      const req = new Request("http://localhost/api/v1/categories");
      const res = await getCategories(req);

      expect(res.status).toBe(200);
      expect(listCategories).toHaveBeenCalledWith(
        "user-b",
        expect.objectContaining({ includeArchived: false }),
      );
    });
  });

  describe("Happy Paths & Validations", () => {
    it("POST /api/v1/categories validates input and returns 201 on success", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(createCategory).mockResolvedValue(categoryA);

      const req = new Request("http://localhost/api/v1/categories", {
        method: "POST",
        body: JSON.stringify({
          type: "income",
          name: "Client work",
          color: "#16a34a",
        }),
      });

      const res = await postCategories(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ data: categoryA });
    });

    it("POST /api/v1/categories returns 400 VALIDATION_ERROR on empty name", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);

      const req = new Request("http://localhost/api/v1/categories", {
        method: "POST",
        body: JSON.stringify({
          type: "income",
          name: "",
        }),
      });

      const res = await postCategories(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.fields?.name).toBeDefined();
    });

    it("DELETE /api/v1/categories/:id returns 204 on successful deletion", async () => {
      vi.mocked(getSessionUser).mockResolvedValue(userA);
      vi.mocked(deleteCategory).mockResolvedValue();

      const req = new Request(
        `http://localhost/api/v1/categories/${categoryA.id}`,
        { method: "DELETE" },
      );
      const res = await deleteCategoryById(req, {
        params: Promise.resolve({ id: categoryA.id }),
      });

      expect(res.status).toBe(204);
    });
  });
});
