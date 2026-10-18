import { z } from "zod";
import {
  currencySchema,
  dateStringSchema,
  nullableStringSchema,
  uuidSchema,
} from "./common";

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "void"]);

export const invoiceDerivedStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "void",
]);

export const invoiceCreateSchema = z
  .object({
    clientId: uuidSchema,
    projectId: uuidSchema.nullable().optional(),
    categoryId: uuidSchema.nullable().optional(),
    number: z
      .string()
      .trim()
      .min(1, "Invoice number is required")
      .max(50, "Invoice number cannot exceed 50 characters"),
    amountMinor: z
      .number()
      .int("Amount must be an integer minor unit")
      .min(1, "Amount must be at least 1 minor unit")
      .max(1_000_000_000_000, "Amount exceeds allowed limit (10^12)"),
    currency: currencySchema.optional(),
    issuedOn: dateStringSchema,
    dueOn: dateStringSchema,
    status: z.enum(["draft", "sent"]).optional(),
    notes: nullableStringSchema(2000),
  })
  .strict()
  .refine(
    (data) => {
      return data.dueOn >= data.issuedOn;
    },
    {
      message: "dueOn must be on or after issuedOn",
      path: ["dueOn"],
    },
  );

export const invoiceUpdateSchema = z
  .object({
    clientId: uuidSchema.optional(),
    projectId: uuidSchema.nullable().optional(),
    categoryId: uuidSchema.nullable().optional(),
    number: z
      .string()
      .trim()
      .min(1, "Invoice number is required")
      .max(50, "Invoice number cannot exceed 50 characters")
      .optional(),
    amountMinor: z
      .number()
      .int("Amount must be an integer minor unit")
      .min(1, "Amount must be at least 1 minor unit")
      .max(1_000_000_000_000, "Amount exceeds allowed limit (10^12)")
      .optional(),
    currency: currencySchema.optional(),
    issuedOn: dateStringSchema.optional(),
    dueOn: dateStringSchema.optional(),
    status: z.enum(["draft", "sent", "void"]).optional(),
    notes: nullableStringSchema(2000),
  })
  .strict()
  .refine(
    (data) => {
      if (data.issuedOn && data.dueOn && data.dueOn < data.issuedOn) {
        return false;
      }
      return true;
    },
    {
      message: "dueOn must be on or after issuedOn",
      path: ["dueOn"],
    },
  );

export const invoiceMarkPaidSchema = z
  .object({
    paidOn: dateStringSchema.optional(),
  })
  .strict();

export const invoiceQuerySchema = z.object({
  clientId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  status: invoiceDerivedStatusSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export const invoiceDtoSchema = z.object({
  id: uuidSchema,
  number: z.string(),
  amountMinor: z.number().int(),
  currency: z.string(),
  status: invoiceStatusSchema,
  derivedStatus: invoiceDerivedStatusSchema,
  issuedOn: z.string(),
  dueOn: z.string(),
  paidOn: z.string().nullable(),
  client: z.object({
    id: uuidSchema,
    name: z.string(),
  }),
  project: z
    .object({
      id: uuidSchema,
      name: z.string(),
    })
    .nullable(),
  category: z
    .object({
      id: uuidSchema,
      name: z.string(),
    })
    .nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type InvoiceDerivedStatus = z.infer<typeof invoiceDerivedStatusSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
export type InvoiceMarkPaidInput = z.infer<typeof invoiceMarkPaidSchema>;
export type InvoiceQueryInput = z.infer<typeof invoiceQuerySchema>;
export type InvoiceDto = z.infer<typeof invoiceDtoSchema>;
