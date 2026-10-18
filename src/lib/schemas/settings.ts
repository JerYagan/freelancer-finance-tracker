import { z } from "zod";
import { currencySchema, nullableStringSchema } from "./common";

export const settingsUpdateSchema = z
  .object({
    displayName: nullableStringSchema(120),
    defaultCurrency: currencySchema.optional(),
    taxSetAsideBps: z
      .number()
      .int("Tax set-aside bps must be an integer")
      .min(0, "Tax set-aside bps cannot be negative")
      .max(10000, "Tax set-aside bps cannot exceed 10000 (100%)")
      .optional(),
    fiscalYearStartMonth: z
      .number()
      .int("Fiscal year start month must be an integer")
      .min(1, "Fiscal year start month must be between 1 and 12")
      .max(12, "Fiscal year start month must be between 1 and 12")
      .optional(),
  })
  .strict();

export const settingsDtoSchema = z.object({
  userId: z.string(),
  displayName: z.string().nullable(),
  defaultCurrency: z.string(),
  taxSetAsideBps: z.number().int(),
  fiscalYearStartMonth: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type SettingsDto = z.infer<typeof settingsDtoSchema>;
