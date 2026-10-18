import { describe, it, expect, vi } from "vitest";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  toCategoryDto,
  updateCategory,
} from "@/server/services/categories";
import { AppError } from "@/server/http";

describe("Categories Service - toCategoryDto", () => {
  it("maps DB row to clean camelCase DTO with ISO timestamp strings", () => {
    const now = new Date("2026-10-18T10:00:00.000Z");
    const row = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "user-1",
      type: "income" as const,
      name: "Retainer",
      color: "#0d9488",
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const dto = toCategoryDto(row);
    expect(dto).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      type: "income",
      name: "Retainer",
      color: "#0d9488",
      archivedAt: null,
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T10:00:00.000Z",
    });
  });
});

describe("Categories Service - Operations", () => {
  const userId = "user-alice";
  const catId = "123e4567-e89b-12d3-a456-426614174001";
  const now = new Date("2026-10-18T10:00:00.000Z");

  const sampleRow = {
    id: catId,
    userId,
    type: "expense" as const,
    name: "Software",
    color: "#6366f1",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  it("lists categories filtered by user_id and active status", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([sampleRow]),
          }),
        }),
      }),
    };

    const result = await listCategories(
      userId,
      { includeArchived: false },
      mockDb as unknown as Parameters<typeof listCategories>[2],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Software");
  });

  it("getCategoryById returns category if owned by user", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([sampleRow]),
          }),
        }),
      }),
    };

    const result = await getCategoryById(
      userId,
      catId,
      mockDb as unknown as Parameters<typeof getCategoryById>[2],
    );

    expect(result.id).toBe(catId);
    expect(result.name).toBe("Software");
  });

  it("getCategoryById throws 404 NOT_FOUND if category does not exist or belongs to another user", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    await expect(
      getCategoryById(
        "other-user",
        catId,
        mockDb as unknown as Parameters<typeof getCategoryById>[2],
      ),
    ).rejects.toThrow(AppError);
  });

  it("createCategory throws 409 CONFLICT on duplicate active name within same type", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-id" }]),
          }),
        }),
      }),
    };

    await expect(
      createCategory(
        userId,
        { type: "expense", name: "Software", color: "#6366f1" },
        mockDb as unknown as Parameters<typeof createCategory>[2],
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("createCategory inserts and returns new category when no collision exists", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([sampleRow]),
        }),
      }),
    };

    const result = await createCategory(
      userId,
      { type: "expense", name: "Software", color: "#6366f1" },
      mockDb as unknown as Parameters<typeof createCategory>[2],
    );

    expect(result.name).toBe("Software");
    expect(result.color).toBe("#6366f1");
  });

  it("updateCategory throws 409 if renaming collides with another active category", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([sampleRow]) // Found existing category
              .mockResolvedValueOnce([{ id: "another-id" }]), // Found colliding category
          }),
        }),
      }),
    };

    await expect(
      updateCategory(
        userId,
        catId,
        { name: "Existing Other Name" },
        mockDb as unknown as Parameters<typeof updateCategory>[3],
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("deleteCategory throws 409 CONFLICT if transactions reference the category", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: catId }]) // Category exists
              .mockResolvedValueOnce([{ id: "tx-123" }]), // Transaction references it!
          }),
        }),
      }),
    };

    await expect(
      deleteCategory(
        userId,
        catId,
        mockDb as unknown as Parameters<typeof deleteCategory>[2],
      ),
    ).rejects.toThrow(/Archive it instead/);
  });

  it("deleteCategory deletes successfully if no transactions reference it", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValueOnce([{ id: catId }]) // Category exists
              .mockResolvedValueOnce([]), // Not used
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    };

    await expect(
      deleteCategory(
        userId,
        catId,
        mockDb as unknown as Parameters<typeof deleteCategory>[2],
      ),
    ).resolves.toBeUndefined();
  });
});
