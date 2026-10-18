import { z } from "zod";
import {
  nullableEmailSchema,
  nullableStringSchema,
  uuidSchema,
} from "./common";

export const clientCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name cannot exceed 120 characters"),
    email: nullableEmailSchema,
    notes: nullableStringSchema(2000),
  })
  .strict();

export const clientUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name cannot exceed 120 characters")
      .optional(),
    email: nullableEmailSchema,
    notes: nullableStringSchema(2000),
    archived: z.boolean().optional(),
  })
  .strict();

export const clientQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
});

export const clientDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type ClientQueryInput = z.infer<typeof clientQuerySchema>;
export type ClientDto = z.infer<typeof clientDtoSchema>;
