import { z } from "zod";
import {
  currencySchema,
  dateStringSchema,
  nullableStringSchema,
  transactionTypeSchema,
  uuidSchema,
} from "./common";

export const recurrenceIntervalSchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const recurringTemplateSchema = z
  .object({
    type: transactionTypeSchema,
    amountMinor: z
      .number()
      .int("Amount must be an integer minor unit")
      .min(1, "Amount must be at least 1 minor unit")
      .max(1_000_000_000_000, "Amount exceeds allowed limit (10^12)"),
    currency: currencySchema.optional(),
    categoryId: uuidSchema,
    clientId: uuidSchema.nullable().optional(),
    projectId: uuidSchema.nullable().optional(),
    description: nullableStringSchema(280),
    notes: nullableStringSchema(2000),
    paymentMethod: nullableStringSchema(50),
  })
  .strict();

export const recurringCreateSchema = z
  .object({
    interval: recurrenceIntervalSchema,
    nextRunOn: dateStringSchema,
    endsOn: dateStringSchema.nullable().optional(),
    template: recurringTemplateSchema,
  })
  .strict()
  .refine(
    (data) => {
      if (data.endsOn && data.endsOn < data.nextRunOn) {
        return false;
      }
      return true;
    },
    {
      message: "endsOn must be on or after nextRunOn",
      path: ["endsOn"],
    },
  );

export const recurringUpdateSchema = z
  .object({
    interval: recurrenceIntervalSchema.optional(),
    nextRunOn: dateStringSchema.optional(),
    endsOn: dateStringSchema.nullable().optional(),
    active: z.boolean().optional(),
    template: recurringTemplateSchema.partial().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.endsOn && data.nextRunOn && data.endsOn < data.nextRunOn) {
        return false;
      }
      return true;
    },
    {
      message: "endsOn must be on or after nextRunOn",
      path: ["endsOn"],
    },
  );

export const recurringQuerySchema = z.object({
  active: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      if (typeof val === "boolean") return val;
      return val === "true";
    }),
});

export const recurringGenerateSchema = z.object({
  throughDate: dateStringSchema.optional(),
});

export type RecurringTemplateInput = z.infer<typeof recurringTemplateSchema>;
export type RecurringCreateInput = z.infer<typeof recurringCreateSchema>;
export type RecurringUpdateInput = z.infer<typeof recurringUpdateSchema>;
export type RecurringQueryInput = z.infer<typeof recurringQuerySchema>;
export type RecurringGenerateInput = z.infer<typeof recurringGenerateSchema>;
