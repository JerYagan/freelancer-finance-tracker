import { clientUpdateSchema } from "@/lib/schemas/clients";
import { uuidSchema } from "@/lib/schemas/common";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteClient,
  getClientById,
  updateClient,
} from "@/server/services/clients";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getClientById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(clientUpdateSchema);
  const data = await updateClient(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteClient(userId, id);
  return noContentResponse();
});
