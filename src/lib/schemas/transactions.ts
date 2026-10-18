import { z } from "zod";
import {
  currencySchema,
  dateStringSchema,
  nullableStringSchema,
  transactionTypeSchema,
  uuidSchema,
} from "./common";

export const transactionCreateSchema = z
  .object({
    type: transactionTypeSchema,
    amountMinor: z
      .number()
      .int("Amount must be an integer minor unit")
      .min(1, "Amount must be at least 1 minor unit")
      .max(1_000_000_000_000, "Amount exceeds allowed limit (10^12)"),
    currency: currencySchema.optional(),
    occurredOn: dateStringSchema,
    categoryId: uuidSchema,
    clientId: uuidSchema.nullable().optional(),
    projectId: uuidSchema.nullable().optional(),
    description: nullableStringSchema(280),
    notes: nullableStringSchema(2000),
    paymentMethod: nullableStringSchema(50),
  })
  .strict();

export const transactionUpdateSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amountMinor: z
      .number()
      .int("Amount must be an integer minor unit")
      .min(1, "Amount must be at least 1 minor unit")
      .max(1_000_000_000_000, "Amount exceeds allowed limit (10^12)")
      .optional(),
    currency: currencySchema.optional(),
    occurredOn: dateStringSchema.optional(),
    categoryId: uuidSchema.optional(),
    clientId: uuidSchema.nullable().optional(),
    projectId: uuidSchema.nullable().optional(),
    description: nullableStringSchema(280),
    notes: nullableStringSchema(2000),
    paymentMethod: nullableStringSchema(50),
  })
  .strict();

export const transactionQuerySchema = z.object({
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  type: transactionTypeSchema.optional(),
  categoryId: uuidSchema.optional(),
  clientId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const transactionDtoSchema = z.object({
  id: uuidSchema,
  type: transactionTypeSchema,
  amountMinor: z.number().int(),
  currency: z.string(),
  occurredOn: z.string(),
  category: z.object({
    id: uuidSchema,
    name: z.string(),
    color: z.string().nullable().optional(),
  }),
  client: z
    .object({
      id: uuidSchema,
      name: z.string(),
    })
    .nullable(),
  project: z
    .object({
      id: uuidSchema,
      name: z.string(),
    })
    .nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  receiptKey: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
export type TransactionDto = z.infer<typeof transactionDtoSchema>;
