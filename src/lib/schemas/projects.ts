import { z } from "zod";
import { uuidSchema } from "./common";

export const projectCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name cannot exceed 120 characters"),
    clientId: uuidSchema.nullable().optional(),
  })
  .strict();

export const projectUpdateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name cannot exceed 120 characters")
      .optional(),
    clientId: uuidSchema.nullable().optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export const projectQuerySchema = z.object({
  clientId: uuidSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const projectDtoSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  clientId: uuidSchema.nullable(),
  clientName: z.string().nullable().optional(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
export type ProjectDto = z.infer<typeof projectDtoSchema>;
