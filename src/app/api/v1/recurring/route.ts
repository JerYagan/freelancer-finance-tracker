import {
  recurringCreateSchema,
  recurringQuerySchema,
} from "@/lib/schemas/recurring";
import { apiHandler, successResponse } from "@/server/http";
import {
  createRecurringRule,
  listRecurringRules,
} from "@/server/services/recurring";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(recurringQuerySchema);
  const data = await listRecurringRules(userId, query);
  return successResponse(data);
});

export const POST = apiHandler(async ({ userId, parseBody }) => {
  const body = await parseBody(recurringCreateSchema);
  const data = await createRecurringRule(userId, body);
  return successResponse(data, 201);
});
