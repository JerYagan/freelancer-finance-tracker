import {
  projectCreateSchema,
  projectQuerySchema,
} from "@/lib/schemas/projects";
import { apiHandler, successResponse } from "@/server/http";
import { createProject, listProjects } from "@/server/services/projects";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(projectQuerySchema);
  const data = await listProjects(userId, query);
  return successResponse(data);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(projectCreateSchema);
  const data = await createProject(userId, body);
  return successResponse(data, 201);
});
