import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { userSettings } from "@/server/db/schema";
import { AppError } from "@/server/http";
import type { SettingsDto, SettingsUpdateInput } from "@/lib/schemas/settings";

export function toSettingsDto(
  row: typeof userSettings.$inferSelect,
): SettingsDto {
  return {
    userId: row.userId,
    displayName: row.displayName ?? null,
    defaultCurrency: row.defaultCurrency,
    taxSetAsideBps: row.taxSetAsideBps,
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Retrieves the settings for a user, automatically creating default settings if none exist yet.
 */
export async function getSettings(
  userId: string,
  client = db,
): Promise<SettingsDto> {
  const [existing] = await client
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  if (existing) {
    return toSettingsDto(existing);
  }

  // Create default settings if not found (e.g. initial access before seed or fresh accounts)
  const [created] = await client
    .insert(userSettings)
    .values({
      userId,
      defaultCurrency: "PHP",
      taxSetAsideBps: 0,
      fiscalYearStartMonth: 1,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { updatedAt: new Date() },
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to retrieve or initialize settings");
  }

  return toSettingsDto(created);
}

/**
 * Updates settings for a user with partial values.
 */
export async function updateSettings(
  userId: string,
  input: SettingsUpdateInput,
  client = db,
): Promise<SettingsDto> {
  const updateValues: Partial<typeof userSettings.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.displayName !== undefined) {
    updateValues.displayName = input.displayName;
  }
  if (input.defaultCurrency !== undefined) {
    updateValues.defaultCurrency = input.defaultCurrency.toUpperCase();
  }
  if (input.taxSetAsideBps !== undefined) {
    updateValues.taxSetAsideBps = input.taxSetAsideBps;
  }
  if (input.fiscalYearStartMonth !== undefined) {
    updateValues.fiscalYearStartMonth = input.fiscalYearStartMonth;
  }

  const [updated] = await client
    .insert(userSettings)
    .values({
      userId,
      defaultCurrency: input.defaultCurrency?.toUpperCase() ?? "PHP",
      taxSetAsideBps: input.taxSetAsideBps ?? 0,
      fiscalYearStartMonth: input.fiscalYearStartMonth ?? 1,
      displayName: input.displayName ?? null,
      ...updateValues,
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: updateValues,
    })
    .returning();

  if (!updated) {
    throw AppError.internal("Failed to update user settings");
  }

  return toSettingsDto(updated);
}
