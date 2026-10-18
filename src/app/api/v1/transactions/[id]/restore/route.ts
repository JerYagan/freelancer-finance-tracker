import { uuidSchema } from "@/lib/schemas/common";
import { apiHandler, successResponse } from "@/server/http";
import { restoreTransaction } from "@/server/services/transactions";

export const POST = apiHandler(async ({ userId, params }) => {
  const resolvedParams = await params;
  const id = uuidSchema.parse(resolvedParams.id);
  const data = await restoreTransaction(userId, id);
  return successResponse(data);
});
