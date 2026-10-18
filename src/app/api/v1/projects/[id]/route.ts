import { projectUpdateSchema } from "@/lib/schemas/projects";
import { uuidSchema } from "@/lib/schemas/common";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteProject,
  getProjectById,
  updateProject,
} from "@/server/services/projects";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getProjectById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(projectUpdateSchema);
  const data = await updateProject(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteProject(userId, id);
  return noContentResponse();
});
