import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { categories, userSettings } from "@/server/db/schema";

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Client work", color: "#16a34a" },
  { name: "Retainer", color: "#0d9488" },
  { name: "Royalties", color: "#0284c7" },
  { name: "Other income", color: "#64748b" },
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Software", color: "#6366f1" },
  { name: "Equipment", color: "#8b5cf6" },
  { name: "Internet and phone", color: "#3b82f6" },
  { name: "Coworking", color: "#ec4899" },
  { name: "Marketing", color: "#f59e0b" },
  { name: "Taxes", color: "#ef4444" },
  { name: "Fees", color: "#f97316" },
  { name: "Learning", color: "#10b981" },
  { name: "Other expense", color: "#71717a" },
] as const;

export const DEFAULT_CATEGORIES = [
  ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
    name: c.name,
    color: c.color,
    type: "income" as const,
  })),
  ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
    name: c.name,
    color: c.color,
    type: "expense" as const,
  })),
];

/**
 * Seeds default categories and user settings for a given user.
 * Idempotent: safe to run multiple times without creating duplicates.
 */
export async function seedUserDefaults(
  userId: string,
  displayName?: string | null,
  client = db,
): Promise<void> {
  await client.transaction(async (tx) => {
    // 1. Seed user_settings if not already present
    const [existingSettings] = await tx
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!existingSettings) {
      await tx.insert(userSettings).values({
        userId,
        displayName: displayName || null,
        defaultCurrency: "PHP",
        taxSetAsideBps: 0,
        fiscalYearStartMonth: 1,
      });
    }

    // 2. Seed default categories if not already present
    const existingCats = await tx
      .select({ name: categories.name, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId));

    const existingKeys = new Set(
      existingCats.map((c) => `${c.type}:${c.name.toLowerCase()}`),
    );

    const categoriesToInsert = DEFAULT_CATEGORIES.filter(
      (c) => !existingKeys.has(`${c.type}:${c.name.toLowerCase()}`),
    ).map((c) => ({
      userId,
      type: c.type,
      name: c.name,
      color: c.color,
    }));

    if (categoriesToInsert.length > 0) {
      await tx.insert(categories).values(categoriesToInsert);
    }
  });
}
