import { uuidSchema } from "@/lib/schemas/common";
import { recurringUpdateSchema } from "@/lib/schemas/recurring";
import { apiHandler, noContentResponse, successResponse } from "@/server/http";
import {
  deleteRecurringRule,
  getRecurringRuleById,
  updateRecurringRule,
} from "@/server/services/recurring";

export const GET = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await getRecurringRuleById(userId, id);
  return successResponse(data);
});

export const PATCH = apiHandler(async ({ userId, params, parseBody }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const body = await parseBody(recurringUpdateSchema);
  const data = await updateRecurringRule(userId, id, body);
  return successResponse(data);
});

export const DELETE = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  await deleteRecurringRule(userId, id);
  return noContentResponse();
});
