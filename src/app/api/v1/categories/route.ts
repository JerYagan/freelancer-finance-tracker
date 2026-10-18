import {
  categoryCreateSchema,
  categoryQuerySchema,
} from "@/lib/schemas/categories";
import { apiHandler, successResponse } from "@/server/http";
import { createCategory, listCategories } from "@/server/services/categories";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(categoryQuerySchema);
  const data = await listCategories(userId, query);
  return successResponse(data);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(categoryCreateSchema);
  const data = await createCategory(userId, body);
  return successResponse(data, 201);
});
