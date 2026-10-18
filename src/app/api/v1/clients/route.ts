import { clientCreateSchema, clientQuerySchema } from "@/lib/schemas/clients";
import { apiHandler, successResponse } from "@/server/http";
import { createClient, listClients } from "@/server/services/clients";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(clientQuerySchema);
  const data = await listClients(userId, query);
  return successResponse(data);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(clientCreateSchema);
  const data = await createClient(userId, body);
  return successResponse(data, 201);
});
