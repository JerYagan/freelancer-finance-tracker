import { categoryUpdateSchema } from "@/lib/schemas/categories";
import { uuidSchema } from "@/lib/schemas/common";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/server/services/categories";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getCategoryById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(categoryUpdateSchema);
  const data = await updateCategory(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteCategory(userId, id);
  return noContentResponse();
});
