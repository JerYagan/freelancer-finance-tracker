import { z } from "zod";
import { categoryDtoSchema } from "./categories";
import { clientDtoSchema } from "./clients";
import { projectDtoSchema } from "./projects";
import { invoiceDtoSchema } from "./invoices";
import { transactionDtoSchema } from "./transactions";
import { settingsDtoSchema } from "./settings";

export const accountDeleteSchema = z
  .object({
    confirmPhrase: z.literal("DELETE", {
      message: 'Please type "DELETE" to confirm account deletion',
    }),
  })
  .strict();

export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;

export const recurringRuleDtoSchema = z.object({
  id: z.string(),
  interval: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  nextRunOn: z.string(),
  endsOn: z.string().nullable(),
  active: z.boolean(),
  template: z.object({
    type: z.enum(["income", "expense"]),
    amountMinor: z.number().int(),
    currency: z.string(),
    categoryId: z.string(),
    clientId: z.string().nullable(),
    projectId: z.string().nullable(),
    description: z.string().nullable(),
    paymentMethod: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
  }),
  client: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  project: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accountExportDtoSchema = z.object({
  exportedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    createdAt: z.string(),
  }),
  settings: settingsDtoSchema,
  categories: z.array(categoryDtoSchema),
  clients: z.array(clientDtoSchema),
  projects: z.array(projectDtoSchema),
  invoices: z.array(invoiceDtoSchema),
  recurringRules: z.array(recurringRuleDtoSchema),
  transactions: z.array(transactionDtoSchema),
});

export type AccountExportDto = z.infer<typeof accountExportDtoSchema>;
