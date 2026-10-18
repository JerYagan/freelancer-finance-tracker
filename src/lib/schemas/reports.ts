import { z } from "zod";
import {
  currencySchema,
  dateStringSchema,
  monthKeySchema,
  uuidSchema,
} from "./common";

export const reportsSummaryQuerySchema = z.object({
  month: monthKeySchema.optional(),
  currency: currencySchema.optional(),
});

export const reportsTrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  currency: currencySchema.optional(),
});

export const exportTransactionsQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});

export const reportSummaryTopClientDtoSchema = z.object({
  clientId: uuidSchema,
  name: z.string(),
  incomeMinor: z.number().int(),
});

export const reportSummaryTopExpenseCategoryDtoSchema = z.object({
  categoryId: uuidSchema,
  name: z.string(),
  expenseMinor: z.number().int(),
});

export const reportsSummaryDtoSchema = z.object({
  month: monthKeySchema,
  currency: z.string(),
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
  netMinor: z.number().int(),
  taxSetAsideMinor: z.number().int(),
  topClients: z.array(reportSummaryTopClientDtoSchema),
  topExpenseCategories: z.array(reportSummaryTopExpenseCategoryDtoSchema),
  availableCurrencies: z.array(z.string()).optional(),
});

export const trendItemDtoSchema = z.object({
  month: monthKeySchema,
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
  netMinor: z.number().int(),
});

export const reportsTaxSummaryQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  currency: currencySchema.optional(),
});

export const taxSummaryMonthDtoSchema = z.object({
  month: monthKeySchema,
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
  netMinor: z.number().int(),
  taxSetAsideMinor: z.number().int(),
});

export const reportsTaxSummaryDtoSchema = z.object({
  year: z.number().int(),
  quarter: z.number().int().min(1).max(4),
  label: z.string(),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  currency: z.string(),
  incomeMinor: z.number().int(),
  expenseMinor: z.number().int(),
  netMinor: z.number().int(),
  taxSetAsideBps: z.number().int(),
  taxSetAsidePercent: z.number(),
  taxSetAsideMinor: z.number().int(),
  months: z.array(taxSummaryMonthDtoSchema),
});

export type ReportsSummaryQueryInput = z.infer<
  typeof reportsSummaryQuerySchema
>;
export type ReportsTrendQueryInput = z.infer<typeof reportsTrendQuerySchema>;
export type ReportsTaxSummaryQueryInput = z.infer<
  typeof reportsTaxSummaryQuerySchema
>;
export type ExportTransactionsQueryInput = z.infer<
  typeof exportTransactionsQuerySchema
>;
export type ReportSummaryTopClientDto = z.infer<
  typeof reportSummaryTopClientDtoSchema
>;
export type ReportSummaryTopExpenseCategoryDto = z.infer<
  typeof reportSummaryTopExpenseCategoryDtoSchema
>;
export type ReportsSummaryDto = z.infer<typeof reportsSummaryDtoSchema>;
export type TrendItemDto = z.infer<typeof trendItemDtoSchema>;
export type TaxSummaryMonthDto = z.infer<typeof taxSummaryMonthDtoSchema>;
export type ReportsTaxSummaryDto = z.infer<typeof reportsTaxSummaryDtoSchema>;
