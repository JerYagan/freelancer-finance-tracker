import { z } from "zod";
import { currencySchema, transactionTypeSchema, uuidSchema } from "./common";

export const dateFormatOptionSchema = z.enum([
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
]);

export const columnMappingSchema = z
  .object({
    dateColumn: z.string().trim().min(1, "Date column name is required"),
    amountColumn: z.string().trim().min(1, "Amount column name is required"),
    typeColumn: z.string().trim().nullable().optional(),
    descriptionColumn: z.string().trim().nullable().optional(),
    categoryColumn: z.string().trim().nullable().optional(),
    clientColumn: z.string().trim().nullable().optional(),
    paymentMethodColumn: z.string().trim().nullable().optional(),
    defaultType: transactionTypeSchema.optional().default("income"),
    defaultCategoryId: uuidSchema.nullable().optional(),
    currency: currencySchema.optional(),
    dateFormat: dateFormatOptionSchema.optional().default("YYYY-MM-DD"),
    hasHeader: z.boolean().optional().default(true),
  })
  .strict();

export const csvPreviewInputSchema = z
  .object({
    csvText: z
      .string()
      .min(1, "CSV text cannot be empty")
      .max(2_000_000, "CSV text exceeds maximum size limit (2MB)"),
    mapping: columnMappingSchema,
  })
  .strict();

export const csvImportInputSchema = z
  .object({
    csvText: z
      .string()
      .min(1, "CSV text cannot be empty")
      .max(2_000_000, "CSV text exceeds maximum size limit (2MB)"),
    mapping: columnMappingSchema,
    skipInvalid: z.boolean().optional().default(false),
  })
  .strict();

export type ColumnMapping = z.infer<typeof columnMappingSchema>;
export type CsvPreviewInput = z.infer<typeof csvPreviewInputSchema>;
export type CsvImportInput = z.infer<typeof csvImportInputSchema>;
