import { z } from "zod";
import { hexColorSchema, transactionTypeSchema, uuidSchema } from "./common";

export const categoryCreateSchema = z
  .object({
    type: transactionTypeSchema,
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(60, "Name cannot exceed 60 characters"),
    color: hexColorSchema.nullable().optional(),
  })
  .strict();

export const categoryUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(60, "Name cannot exceed 60 characters")
      .optional(),
    color: hexColorSchema.nullable().optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export const categoryQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const categoryDtoSchema = z.object({
  id: uuidSchema,
  type: transactionTypeSchema,
  name: z.string(),
  color: z.string().nullable(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type CategoryDto = z.infer<typeof categoryDtoSchema>;
