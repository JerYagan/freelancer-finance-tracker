import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, projects, transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import type {
  ClientCreateInput,
  ClientDto,
  ClientQueryInput,
  ClientUpdateInput,
} from "@/lib/schemas/clients";

export function toClientDto(row: typeof clients.$inferSelect): ClientDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    notes: row.notes,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lists clients for the user, with optional archived filtering.
 */
export async function listClients(
  userId: string,
  query?: ClientQueryInput,
  client = db,
): Promise<ClientDto[]> {
  const conditions = [eq(clients.userId, userId)];

  if (!query?.includeArchived) {
    conditions.push(isNull(clients.archivedAt));
  }

  const rows = await client
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(sql`lower(${clients.name}) asc`);

  return rows.map(toClientDto);
}

/**
 * Retrieves a single client by ID scoped to the authenticated user.
 */
export async function getClientById(
  userId: string,
  id: string,
  client = db,
): Promise<ClientDto> {
  const [row] = await client
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Client not found");
  }

  return toClientDto(row);
}

/**
 * Creates a new client, rejecting active duplicate names.
 */
export async function createClient(
  userId: string,
  input: ClientCreateInput,
  client = db,
): Promise<ClientDto> {
  const trimmedName = input.name.trim();

  // Check for duplicate active client
  const [existing] = await client
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.userId, userId),
        sql`lower(${clients.name}) = lower(${trimmedName})`,
        isNull(clients.archivedAt),
      ),
    )
    .limit(1);

  if (existing) {
    throw AppError.conflict(
      `An active client named "${trimmedName}" already exists`,
    );
  }

  const [created] = await client
    .insert(clients)
    .values({
      userId,
      name: trimmedName,
      email: input.email ?? null,
      notes: input.notes ?? null,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create client");
  }

  return toClientDto(created);
}

/**
 * Updates a client's name, email, notes, or archived status.
 */
export async function updateClient(
  userId: string,
  id: string,
  input: ClientUpdateInput,
  client = db,
): Promise<ClientDto> {
  const [existing] = await client
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Client not found");
  }

  const targetName =
    input.name !== undefined ? input.name.trim() : existing.name;
  const isArchived =
    input.archived !== undefined
      ? input.archived
      : existing.archivedAt !== null;

  if (!isArchived) {
    const [conflict] = await client
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.userId, userId),
          sql`lower(${clients.name}) = lower(${targetName})`,
          isNull(clients.archivedAt),
          ne(clients.id, id),
        ),
      )
      .limit(1);

    if (conflict) {
      throw AppError.conflict(
        `An active client named "${targetName}" already exists`,
      );
    }
  }

  const updateValues: Partial<typeof clients.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = targetName;
  }

  if (input.email !== undefined) {
    updateValues.email = input.email;
  }

  if (input.notes !== undefined) {
    updateValues.notes = input.notes;
  }

  if (input.archived !== undefined) {
    updateValues.archivedAt = input.archived ? new Date() : null;
  }

  const [updated] = await client
    .update(clients)
    .set(updateValues)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Client not found");
  }

  return toClientDto(updated);
}

/**
 * Deletes a client if not in use by any project or transaction.
 */
export async function deleteClient(
  userId: string,
  id: string,
  client = db,
): Promise<void> {
  const [existing] = await client
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Client not found");
  }

  // Check if client has associated projects
  const [hasProjects] = await client
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.clientId, id), eq(projects.userId, userId)))
    .limit(1);

  if (hasProjects) {
    throw AppError.conflict(
      "Client has associated projects. Archive it instead.",
    );
  }

  // Check if client has associated transactions
  const [hasTransactions] = await client
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.clientId, id), eq(transactions.userId, userId)))
    .limit(1);

  if (hasTransactions) {
    throw AppError.conflict(
      "Client is used by existing transactions. Archive it instead.",
    );
  }

  await client
    .delete(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)));
}
