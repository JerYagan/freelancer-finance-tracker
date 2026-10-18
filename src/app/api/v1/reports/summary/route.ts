import { reportsSummaryQuerySchema } from "@/lib/schemas/reports";
import { apiHandler, successResponse } from "@/server/http";
import { getMonthSummary } from "@/server/services/reports";

export const GET = apiHandler(async ({ userId, parseQuery }) => {
  const query = parseQuery(reportsSummaryQuerySchema);
  const data = await getMonthSummary(userId, query);
  return successResponse(data);
});
