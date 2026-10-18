import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { categories, transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import type {
  CategoryCreateInput,
  CategoryDto,
  CategoryQueryInput,
  CategoryUpdateInput,
} from "@/lib/schemas/categories";

export function toCategoryDto(
  row: typeof categories.$inferSelect,
): CategoryDto {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    color: row.color,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lists categories for a user, with optional type and archived filtering.
 */
export async function listCategories(
  userId: string,
  query?: CategoryQueryInput,
  client = db,
): Promise<CategoryDto[]> {
  const conditions = [eq(categories.userId, userId)];

  if (query?.type) {
    conditions.push(eq(categories.type, query.type));
  }

  if (!query?.includeArchived) {
    conditions.push(isNull(categories.archivedAt));
  }

  const rows = await client
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(sql`lower(${categories.name}) asc`);

  return rows.map(toCategoryDto);
}

/**
 * Retrieves a single category by ID scoped to the authenticated user.
 */
export async function getCategoryById(
  userId: string,
  id: string,
  client = db,
): Promise<CategoryDto> {
  const [row] = await client
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Category not found");
  }

  return toCategoryDto(row);
}

/**
 * Creates a new category for the user, rejecting duplicates within the same type.
 */
export async function createCategory(
  userId: string,
  input: CategoryCreateInput,
  client = db,
): Promise<CategoryDto> {
  const trimmedName = input.name.trim();

  // Check for duplicate active category with same type and lower(name)
  const [existing] = await client
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.type, input.type),
        sql`lower(${categories.name}) = lower(${trimmedName})`,
        isNull(categories.archivedAt),
      ),
    )
    .limit(1);

  if (existing) {
    throw AppError.conflict(
      `An active ${input.type} category named "${trimmedName}" already exists`,
    );
  }

  const [created] = await client
    .insert(categories)
    .values({
      userId,
      type: input.type,
      name: trimmedName,
      color: input.color ?? null,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create category");
  }

  return toCategoryDto(created);
}

/**
 * Updates a category's name, color, or archived status.
 */
export async function updateCategory(
  userId: string,
  id: string,
  input: CategoryUpdateInput,
  client = db,
): Promise<CategoryDto> {
  const [existing] = await client
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Category not found");
  }

  const targetName =
    input.name !== undefined ? input.name.trim() : existing.name;
  const isArchived =
    input.archived !== undefined
      ? input.archived
      : existing.archivedAt !== null;

  // If active, check for name collision with another category of the same type
  if (!isArchived) {
    const [conflict] = await client
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.type, existing.type),
          sql`lower(${categories.name}) = lower(${targetName})`,
          isNull(categories.archivedAt),
          ne(categories.id, id),
        ),
      )
      .limit(1);

    if (conflict) {
      throw AppError.conflict(
        `An active ${existing.type} category named "${targetName}" already exists`,
      );
    }
  }

  const updateValues: Partial<typeof categories.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = targetName;
  }

  if (input.color !== undefined) {
    updateValues.color = input.color;
  }

  if (input.archived !== undefined) {
    updateValues.archivedAt = input.archived ? new Date() : null;
  }

  const [updated] = await client
    .update(categories)
    .set(updateValues)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Category not found");
  }

  return toCategoryDto(updated);
}

/**
 * Deletes an unused category. If transactions reference it, throws 409 CONFLICT to archive instead.
 */
export async function deleteCategory(
  userId: string,
  id: string,
  client = db,
): Promise<void> {
  const [existing] = await client
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Category not found");
  }

  // Check if any transaction references this category
  const [used] = await client
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(eq(transactions.categoryId, id), eq(transactions.userId, userId)),
    )
    .limit(1);

  if (used) {
    throw AppError.conflict(
      "Category is used by existing transactions. Archive it instead.",
    );
  }

  await client
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
}
