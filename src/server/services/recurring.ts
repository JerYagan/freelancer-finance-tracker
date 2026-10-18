import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "../db/client";
import {
  categories,
  clients,
  projects,
  recurringRules,
  RecurringTemplate,
  userSettings,
} from "../db/schema";
import { AppError } from "../http";
import {
  RecurringCreateInput,
  RecurringQueryInput,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";
import { TransactionDto } from "@/lib/schemas/transactions";
import { advanceRecurrenceDate, getTodayDateString } from "@/lib/dates";
import { createTransaction } from "./transactions";

export interface RecurringRuleDto {
  id: string;
  interval: "weekly" | "monthly" | "quarterly" | "yearly";
  nextRunOn: string;
  endsOn: string | null;
  active: boolean;
  template: {
    type: "income" | "expense";
    amountMinor: number;
    currency: string;
    categoryId: string;
    clientId: string | null;
    projectId: string | null;
    description: string | null;
    paymentMethod: string | null;
    notes: string | null;
  };
  category: {
    id: string;
    name: string;
    color: string | null;
  };
  client: {
    id: string;
    name: string;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResultDto {
  generatedCount: number;
  transactions: TransactionDto[];
}

async function hydrateRules(
  userId: string,
  rules: (typeof recurringRules.$inferSelect)[],
  client = db,
): Promise<RecurringRuleDto[]> {
  if (rules.length === 0) {
    return [];
  }

  const categoryIds = new Set<string>();
  const clientIds = new Set<string>();
  const projectIds = new Set<string>();

  for (const rule of rules) {
    const tmpl = rule.template as RecurringTemplate;
    if (tmpl.categoryId) categoryIds.add(tmpl.categoryId);
    if (tmpl.clientId) clientIds.add(tmpl.clientId);
    if (tmpl.projectId) projectIds.add(tmpl.projectId);
  }

  const categoryMap = new Map<
    string,
    { id: string; name: string; color: string | null }
  >();
  if (categoryIds.size > 0) {
    const cats = await client
      .select({
        id: categories.id,
        name: categories.name,
        color: categories.color,
      })
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          inArray(categories.id, Array.from(categoryIds)),
        ),
      );
    for (const c of cats) {
      categoryMap.set(c.id, { id: c.id, name: c.name, color: c.color });
    }
  }

  const clientMap = new Map<string, { id: string; name: string }>();
  if (clientIds.size > 0) {
    const cls = await client
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          inArray(clients.id, Array.from(clientIds)),
        ),
      );
    for (const c of cls) {
      clientMap.set(c.id, { id: c.id, name: c.name });
    }
  }

  const projectMap = new Map<string, { id: string; name: string }>();
  if (projectIds.size > 0) {
    const projs = await client
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          inArray(projects.id, Array.from(projectIds)),
        ),
      );
    for (const p of projs) {
      projectMap.set(p.id, { id: p.id, name: p.name });
    }
  }

  return rules.map((rule) => {
    const tmpl = rule.template as RecurringTemplate;
    const cat = categoryMap.get(tmpl.categoryId) ?? {
      id: tmpl.categoryId,
      name: "Unknown",
      color: null,
    };
    const cl = tmpl.clientId ? (clientMap.get(tmpl.clientId) ?? null) : null;
    const pr = tmpl.projectId ? (projectMap.get(tmpl.projectId) ?? null) : null;

    return {
      id: rule.id,
      interval: rule.interval,
      nextRunOn: rule.nextRunOn,
      endsOn: rule.endsOn ?? null,
      active: rule.active,
      template: {
        type: tmpl.type,
        amountMinor: Number(tmpl.amountMinor),
        currency: tmpl.currency,
        categoryId: tmpl.categoryId,
        clientId: tmpl.clientId ?? null,
        projectId: tmpl.projectId ?? null,
        description: tmpl.description ?? null,
        paymentMethod: tmpl.paymentMethod ?? null,
        notes: tmpl.notes ?? null,
      },
      category: cat,
      client: cl,
      project: pr,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
  });
}

/**
 * Lists all recurring rules for a user, optionally filtered by active status.
 */
export async function listRecurringRules(
  userId: string,
  query?: RecurringQueryInput,
  client = db,
): Promise<RecurringRuleDto[]> {
  const conditions = [eq(recurringRules.userId, userId)];

  if (query?.active !== undefined) {
    conditions.push(eq(recurringRules.active, query.active));
  }

  const rows = await client
    .select()
    .from(recurringRules)
    .where(and(...conditions))
    .orderBy(asc(recurringRules.nextRunOn));

  return hydrateRules(userId, rows, client);
}

/**
 * Retrieves a single recurring rule by ID.
 */
export async function getRecurringRuleById(
  userId: string,
  id: string,
  client = db,
): Promise<RecurringRuleDto> {
  const [row] = await client
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Recurring rule not found");
  }

  const [dto] = await hydrateRules(userId, [row], client);
  if (!dto) {
    throw AppError.notFound("Recurring rule not found");
  }
  return dto;
}

/**
 * Creates a recurring rule with full referential integrity checks.
 */
export async function createRecurringRule(
  userId: string,
  input: RecurringCreateInput,
  client = db,
): Promise<RecurringRuleDto> {
  // 1. Verify Category exists, belongs to user, matches type, not archived
  const [category] = await client
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, input.template.categoryId),
        eq(categories.userId, userId),
      ),
    )
    .limit(1);

  if (!category) {
    throw AppError.notFound("Category not found");
  }

  if (category.archivedAt !== null) {
    throw AppError.conflict(
      "Cannot assign an archived category to a recurring rule",
    );
  }

  if (category.type !== input.template.type) {
    throw AppError.ruleViolation(
      `Category "${category.name}" is an ${category.type} category, but rule template is ${input.template.type}`,
    );
  }

  // 2. Verify Client if provided
  let resolvedClientId = input.template.clientId ?? null;
  if (input.template.clientId) {
    const [associatedClient] = await client
      .select({ id: clients.id, archivedAt: clients.archivedAt })
      .from(clients)
      .where(
        and(
          eq(clients.id, input.template.clientId),
          eq(clients.userId, userId),
        ),
      )
      .limit(1);

    if (!associatedClient) {
      throw AppError.notFound("Client not found");
    }

    if (associatedClient.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived client to a recurring rule",
      );
    }
  }

  // 3. Verify Project if provided
  if (input.template.projectId) {
    const [associatedProject] = await client
      .select({
        id: projects.id,
        clientId: projects.clientId,
        archivedAt: projects.archivedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, input.template.projectId),
          eq(projects.userId, userId),
        ),
      )
      .limit(1);

    if (!associatedProject) {
      throw AppError.notFound("Project not found");
    }

    if (associatedProject.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived project to a recurring rule",
      );
    }

    if (
      associatedProject.clientId &&
      resolvedClientId &&
      associatedProject.clientId !== resolvedClientId
    ) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }

    if (associatedProject.clientId && !resolvedClientId) {
      resolvedClientId = associatedProject.clientId;
    }
  }

  // 4. Resolve currency
  let currency = input.template.currency;
  if (!currency) {
    const [settings] = await client
      .select({ defaultCurrency: userSettings.defaultCurrency })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    currency = settings?.defaultCurrency ?? "PHP";
  }

  // 5. Verify endsOn >= nextRunOn
  if (input.endsOn && input.endsOn < input.nextRunOn) {
    throw AppError.validation("endsOn must be on or after nextRunOn");
  }

  const template: RecurringTemplate = {
    type: input.template.type,
    amountMinor: input.template.amountMinor,
    currency: currency.toUpperCase(),
    categoryId: input.template.categoryId,
    clientId: resolvedClientId,
    projectId: input.template.projectId ?? null,
    description: input.template.description ?? null,
    paymentMethod: input.template.paymentMethod ?? null,
    notes: input.template.notes ?? null,
  };

  const [created] = await client
    .insert(recurringRules)
    .values({
      userId,
      interval: input.interval,
      nextRunOn: input.nextRunOn,
      endsOn: input.endsOn ?? null,
      active: true,
      template,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create recurring rule");
  }

  const [dto] = await hydrateRules(userId, [created], client);
  return dto!;
}

/**
 * Updates a recurring rule.
 */
export async function updateRecurringRule(
  userId: string,
  id: string,
  input: RecurringUpdateInput,
  client = db,
): Promise<RecurringRuleDto> {
  const [existing] = await client
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Recurring rule not found");
  }

  const existingTemplate = existing.template as RecurringTemplate;
  const mergedTemplate: RecurringTemplate = {
    type: input.template?.type ?? existingTemplate.type,
    amountMinor: input.template?.amountMinor ?? existingTemplate.amountMinor,
    currency: (
      input.template?.currency ?? existingTemplate.currency
    ).toUpperCase(),
    categoryId: input.template?.categoryId ?? existingTemplate.categoryId,
    clientId:
      input.template?.clientId !== undefined
        ? input.template.clientId
        : existingTemplate.clientId,
    projectId:
      input.template?.projectId !== undefined
        ? input.template.projectId
        : existingTemplate.projectId,
    description:
      input.template?.description !== undefined
        ? input.template.description
        : existingTemplate.description,
    paymentMethod:
      input.template?.paymentMethod !== undefined
        ? input.template.paymentMethod
        : existingTemplate.paymentMethod,
    notes:
      input.template?.notes !== undefined
        ? input.template.notes
        : existingTemplate.notes,
  };

  // If category changed, validate
  if (mergedTemplate.categoryId !== existingTemplate.categoryId) {
    const [category] = await client
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, mergedTemplate.categoryId),
          eq(categories.userId, userId),
        ),
      )
      .limit(1);

    if (!category) {
      throw AppError.notFound("Category not found");
    }

    if (category.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived category to a recurring rule",
      );
    }

    if (category.type !== mergedTemplate.type) {
      throw AppError.ruleViolation(
        `Category "${category.name}" is an ${category.type} category, but rule template is ${mergedTemplate.type}`,
      );
    }
  }

  // If client changed, validate
  if (
    mergedTemplate.clientId &&
    mergedTemplate.clientId !== existingTemplate.clientId
  ) {
    const [associatedClient] = await client
      .select({ id: clients.id, archivedAt: clients.archivedAt })
      .from(clients)
      .where(
        and(
          eq(clients.id, mergedTemplate.clientId),
          eq(clients.userId, userId),
        ),
      )
      .limit(1);

    if (!associatedClient) {
      throw AppError.notFound("Client not found");
    }

    if (associatedClient.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived client to a recurring rule",
      );
    }
  }

  // If project changed, validate
  if (
    mergedTemplate.projectId &&
    mergedTemplate.projectId !== existingTemplate.projectId
  ) {
    const [associatedProject] = await client
      .select({
        id: projects.id,
        clientId: projects.clientId,
        archivedAt: projects.archivedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, mergedTemplate.projectId),
          eq(projects.userId, userId),
        ),
      )
      .limit(1);

    if (!associatedProject) {
      throw AppError.notFound("Project not found");
    }

    if (associatedProject.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived project to a recurring rule",
      );
    }

    if (
      associatedProject.clientId &&
      mergedTemplate.clientId &&
      associatedProject.clientId !== mergedTemplate.clientId
    ) {
      throw AppError.ruleViolation(
        "Project does not belong to the specified client",
      );
    }

    if (associatedProject.clientId && !mergedTemplate.clientId) {
      mergedTemplate.clientId = associatedProject.clientId;
    }
  }

  const nextRunOn = input.nextRunOn ?? existing.nextRunOn;
  const endsOn = input.endsOn !== undefined ? input.endsOn : existing.endsOn;

  if (endsOn && endsOn < nextRunOn) {
    throw AppError.validation("endsOn must be on or after nextRunOn");
  }

  const [updated] = await client
    .update(recurringRules)
    .set({
      interval: input.interval ?? existing.interval,
      nextRunOn,
      endsOn: endsOn ?? null,
      active: input.active !== undefined ? input.active : existing.active,
      template: mergedTemplate,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.internal("Failed to update recurring rule");
  }

  const [dto] = await hydrateRules(userId, [updated], client);
  return dto!;
}

/**
 * Deletes a recurring rule. Sets recurring_rule_id = null on past transactions via foreign key constraint.
 */
export async function deleteRecurringRule(
  userId: string,
  id: string,
  client = db,
): Promise<{ id: string; deleted: true }> {
  const [existing] = await client
    .select({ id: recurringRules.id })
    .from(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Recurring rule not found");
  }

  await client
    .delete(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));

  return { id, deleted: true };
}

/**
 * Generates due transactions for active recurring rules up to throughDate (defaults to today).
 */
export async function generateDueRecurringTransactions(
  userId: string,
  throughDate?: string,
  client = db,
): Promise<GenerateResultDto> {
  const targetDate = throughDate ?? getTodayDateString();

  const rules = await client
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        lte(recurringRules.nextRunOn, targetDate),
      ),
    )
    .orderBy(asc(recurringRules.nextRunOn));

  const generatedTransactions: TransactionDto[] = [];

  for (const rule of rules) {
    let currentNextRunOn = rule.nextRunOn;
    let isActive = rule.active;
    const tmpl = rule.template as RecurringTemplate;

    while (isActive && currentNextRunOn <= targetDate) {
      const tx = await createTransaction(
        userId,
        {
          type: tmpl.type,
          amountMinor: tmpl.amountMinor,
          currency: tmpl.currency,
          occurredOn: currentNextRunOn,
          categoryId: tmpl.categoryId,
          clientId: tmpl.clientId ?? null,
          projectId: tmpl.projectId ?? null,
          description: tmpl.description ?? null,
          notes: tmpl.notes ?? null,
          paymentMethod: tmpl.paymentMethod ?? null,
        },
        client,
        { recurringRuleId: rule.id },
      );
      generatedTransactions.push(tx);

      const advancedDate = advanceRecurrenceDate(
        currentNextRunOn,
        rule.interval,
      );

      if (rule.endsOn && advancedDate > rule.endsOn) {
        isActive = false;
      }
      currentNextRunOn = advancedDate;
    }

    await client
      .update(recurringRules)
      .set({
        nextRunOn: currentNextRunOn,
        active: isActive,
        updatedAt: new Date(),
      })
      .where(
        and(eq(recurringRules.id, rule.id), eq(recurringRules.userId, userId)),
      );
  }

  return {
    generatedCount: generatedTransactions.length,
    transactions: generatedTransactions,
  };
}
