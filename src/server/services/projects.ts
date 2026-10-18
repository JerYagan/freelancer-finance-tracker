import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { clients, projects, transactions } from "@/server/db/schema";
import { AppError } from "@/server/http";
import type {
  ProjectCreateInput,
  ProjectDto,
  ProjectQueryInput,
  ProjectUpdateInput,
} from "@/lib/schemas/projects";

export function toProjectDto(
  row: typeof projects.$inferSelect,
  clientName?: string | null,
): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    clientName: clientName ?? null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lists projects for the user, with optional client and archived filtering.
 */
export async function listProjects(
  userId: string,
  query?: ProjectQueryInput,
  client = db,
): Promise<ProjectDto[]> {
  const conditions = [eq(projects.userId, userId)];

  if (query?.clientId) {
    conditions.push(eq(projects.clientId, query.clientId));
  }

  if (!query?.includeArchived) {
    conditions.push(isNull(projects.archivedAt));
  }

  const rows = await client
    .select({
      project: projects,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(sql`lower(${projects.name}) asc`);

  return rows.map((r) => toProjectDto(r.project, r.clientName));
}

/**
 * Retrieves a single project by ID scoped to the authenticated user.
 */
export async function getProjectById(
  userId: string,
  id: string,
  client = db,
): Promise<ProjectDto> {
  const [row] = await client
    .select({
      project: projects,
      clientName: clients.name,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!row) {
    throw AppError.notFound("Project not found");
  }

  return toProjectDto(row.project, row.clientName);
}

/**
 * Creates a new project. If clientId is supplied, verifies it belongs to the user and is not archived.
 */
export async function createProject(
  userId: string,
  input: ProjectCreateInput,
  client = db,
): Promise<ProjectDto> {
  let clientName: string | null = null;

  if (input.clientId) {
    const [associatedClient] = await client
      .select({
        id: clients.id,
        name: clients.name,
        archivedAt: clients.archivedAt,
      })
      .from(clients)
      .where(and(eq(clients.id, input.clientId), eq(clients.userId, userId)))
      .limit(1);

    if (!associatedClient) {
      throw AppError.notFound("Client not found");
    }

    if (associatedClient.archivedAt !== null) {
      throw AppError.conflict(
        "Cannot assign an archived client to a new project",
      );
    }

    clientName = associatedClient.name;
  }

  const [created] = await client
    .insert(projects)
    .values({
      userId,
      name: input.name.trim(),
      clientId: input.clientId ?? null,
    })
    .returning();

  if (!created) {
    throw AppError.internal("Failed to create project");
  }

  return toProjectDto(created, clientName);
}

/**
 * Updates a project's name, clientId, or archived status.
 */
export async function updateProject(
  userId: string,
  id: string,
  input: ProjectUpdateInput,
  client = db,
): Promise<ProjectDto> {
  const [existing] = await client
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Project not found");
  }

  let clientName: string | null = null;
  const targetClientId =
    input.clientId !== undefined ? input.clientId : existing.clientId;

  if (targetClientId) {
    const [associatedClient] = await client
      .select({
        id: clients.id,
        name: clients.name,
        archivedAt: clients.archivedAt,
      })
      .from(clients)
      .where(and(eq(clients.id, targetClientId), eq(clients.userId, userId)))
      .limit(1);

    if (!associatedClient) {
      throw AppError.notFound("Client not found");
    }

    // Only reject archived client if the clientId is actively being changed to an archived client
    if (
      input.clientId !== undefined &&
      input.clientId !== existing.clientId &&
      associatedClient.archivedAt !== null
    ) {
      throw AppError.conflict("Cannot assign an archived client");
    }

    clientName = associatedClient.name;
  }

  const updateValues: Partial<typeof projects.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateValues.name = input.name.trim();
  }

  if (input.clientId !== undefined) {
    updateValues.clientId = input.clientId;
  }

  if (input.archived !== undefined) {
    updateValues.archivedAt = input.archived ? new Date() : null;
  }

  const [updated] = await client
    .update(projects)
    .set(updateValues)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Project not found");
  }

  return toProjectDto(updated, clientName);
}

/**
 * Deletes a project if not in use by any transaction.
 */
export async function deleteProject(
  userId: string,
  id: string,
  client = db,
): Promise<void> {
  const [existing] = await client
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);

  if (!existing) {
    throw AppError.notFound("Project not found");
  }

  const [used] = await client
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.projectId, id), eq(transactions.userId, userId)))
    .limit(1);

  if (used) {
    throw AppError.conflict(
      "Project is used by existing transactions. Archive it instead.",
    );
  }

  await client
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}
