import { reportsTrendQuerySchema } from "@/lib/schemas/reports";
import { apiHandler, successResponse } from "@/server/http";
import { getTrend } from "@/server/services/reports";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(reportsTrendQuerySchema);
  const data = await getTrend(userId, query);
  return successResponse(data);
});
